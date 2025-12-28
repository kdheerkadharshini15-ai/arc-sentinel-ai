"""
A.R.C SENTINEL - ML Anomaly Detection Module
=============================================
Isolation Forest-based anomaly detection for security events
Enhanced with frequency, rarity, and entropy features
"""

from typing import Dict, Any, Optional, List, Tuple
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import numpy as np
import pickle
import asyncio
import math
from collections import Counter

from app.config import settings
from app import database


class MLAnomalyDetector:
    """
    Machine Learning based anomaly detection using Isolation Forest.
    Trained on baseline telemetry to detect abnormal patterns.
    
    Features:
    - Event type rarity (from database)
    - Source IP rarity (from database)
    - Event frequency in last N minutes
    - Payload entropy (Shannon entropy estimation)
    - Severity score
    - Hour of day
    - Port (normalized)
    - Bytes transferred (normalized)
    """
    
    def __init__(self):
        self.model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self.is_trained: bool = False
        self.training_samples: int = 0
        self.feature_names = [
            "event_type_rarity",
            "source_ip_rarity",
            "event_frequency",
            "payload_entropy",
            "severity_score",
            "hour_of_day",
            "ip_last_octet",
            "port_normalized",
            "bytes_normalized",
            "details_complexity"
        ]
    
    async def load_model(self) -> bool:
        """Load model from database if available"""
        try:
            model_bytes = await database.load_ml_model()
            if model_bytes:
                data = pickle.loads(model_bytes)
                self.model = data.get("model")
                self.scaler = data.get("scaler")
                self.training_samples = data.get("samples", 0)
                self.is_trained = True
                print(f"[ML] Model loaded from database ({self.training_samples} samples)")
                return True
        except Exception as e:
            print(f"[ML] Error loading model: {e}")
        return False
    
    async def train(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Train the Isolation Forest model on baseline events.
        Returns training statistics.
        """
        if len(events) < 10:
            return {
                "status": "error",
                "error": "Not enough data to train model",
                "min_required": 10,
                "current_count": len(events)
            }
        
        try:
            # Extract features from events
            features = []
            for event in events:
                feature_vector = await self._extract_features_async(event)
                if feature_vector is not None:
                    features.append(feature_vector)
            
            if len(features) < 10:
                return {
                    "status": "error",
                    "error": "Not enough valid features extracted",
                    "valid_events": len(features)
                }
            
            X = np.array(features)
            
            # Fit scaler
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            
            # Train Isolation Forest
            self.model = IsolationForest(
                contamination=settings.ML_CONTAMINATION,
                random_state=42,
                n_estimators=100,
                max_samples="auto"
            )
            self.model.fit(X_scaled)
            
            self.is_trained = True
            self.training_samples = len(features)
            
            # Save model to database
            model_data = {
                "model": self.model,
                "scaler": self.scaler,
                "samples": self.training_samples,
                "feature_names": self.feature_names
            }
            model_bytes = pickle.dumps(model_data)
            await database.save_ml_model(model_bytes)
            
            print(f"[ML] Model trained successfully with {self.training_samples} samples")
            
            return {
                "status": "model_trained",
                "samples": self.training_samples,
                "features_per_sample": len(self.feature_names),
                "feature_names": self.feature_names,
                "contamination": settings.ML_CONTAMINATION,
                "threshold": settings.ML_ANOMALY_THRESHOLD
            }
            
        except Exception as e:
            print(f"[ML] Training error: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def predict(self, event: Dict[str, Any]) -> Tuple[float, bool]:
        """
        Predict if an event is anomalous.
        Returns (anomaly_score, is_anomaly)
        """
        if not self.is_trained or self.model is None or self.scaler is None:
            return 0.0, False
        
        try:
            features = self._extract_features_sync(event)
            if features is None:
                return 0.0, False
            
            X = np.array([features])
            X_scaled = self.scaler.transform(X)
            
            # Get anomaly score (negative = more anomalous)
            raw_score = self.model.decision_function(X_scaled)[0]
            
            # Normalize score to 0-1 range (higher = more anomalous)
            # Isolation Forest: normal samples have positive scores, anomalies have negative
            normalized_score = 1.0 / (1.0 + np.exp(raw_score))  # Sigmoid normalization
            
            is_anomaly = normalized_score >= settings.ML_ANOMALY_THRESHOLD
            
            return float(normalized_score), is_anomaly
            
        except Exception as e:
            print(f"[ML] Prediction error: {e}")
            return 0.0, False
    
    def calculate_entropy(self, data: str) -> float:
        """
        Calculate Shannon entropy of a string (payload).
        Higher entropy = more randomness (potentially encrypted/encoded data).
        Returns normalized value 0-1.
        """
        if not data or len(data) == 0:
            return 0.0
        
        try:
            # Count character frequencies
            freq = Counter(data)
            total = len(data)
            
            # Calculate Shannon entropy
            entropy = 0.0
            for count in freq.values():
                if count > 0:
                    prob = count / total
                    entropy -= prob * math.log2(prob)
            
            # Normalize to 0-1 (max entropy for ASCII is ~7 bits)
            max_entropy = math.log2(min(256, len(set(data))))
            if max_entropy > 0:
                normalized = entropy / max_entropy
            else:
                normalized = 0.0
            
            return round(min(normalized, 1.0), 4)
            
        except Exception as e:
            print(f"[ML] Entropy calculation error: {e}")
            return 0.5
    
    async def _extract_features_async(self, event: Dict[str, Any]) -> Optional[List[float]]:
        """Extract features asynchronously (for training with DB lookups)"""
        try:
            details = event.get("details", {})
            source_ip = event.get("source_ip", "0.0.0.0")
            event_type = event.get("type", "unknown")
            
            # Get rarity and frequency from database
            type_rarity = await database.get_event_type_rarity(event_type)
            ip_rarity = await database.get_ip_rarity(source_ip)
            event_freq = await database.get_event_frequency(source_ip, minutes=5)
            
            # Payload entropy
            payload_entropy = self.calculate_entropy(str(details))
            
            # Severity score
            severity_map = {"low": 0.25, "medium": 0.5, "high": 0.75, "critical": 1.0}
            severity_score = severity_map.get(event.get("severity", "low"), 0.25)
            
            # Hour of day
            from datetime import datetime
            timestamp = event.get("timestamp", "")
            try:
                if isinstance(timestamp, str):
                    dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                else:
                    dt = datetime.utcnow()
                hour_normalized = dt.hour / 24.0
            except:
                hour_normalized = 0.5
            
            # IP last octet
            try:
                last_octet = int(source_ip.split(".")[-1]) / 255.0
            except:
                last_octet = 0.5
            
            # Port (normalized)
            port = details.get("port", 0)
            port_normalized = min(port / 65535.0, 1.0)
            
            # Bytes (normalized)
            bytes_val = details.get("bytes", 0)
            bytes_normalized = min(bytes_val / 100000.0, 1.0)
            
            # Details complexity
            details_complexity = min(len(str(details)) / 1000.0, 1.0)
            
            # Normalize frequency (cap at 100)
            freq_normalized = min(event_freq / 100.0, 1.0)
            
            return [
                type_rarity,
                ip_rarity,
                freq_normalized,
                payload_entropy,
                severity_score,
                hour_normalized,
                last_octet,
                port_normalized,
                bytes_normalized,
                details_complexity
            ]
            
        except Exception as e:
            print(f"[ML] Async feature extraction error: {e}")
            return None
    
    def _extract_features_sync(self, event: Dict[str, Any]) -> Optional[List[float]]:
        """Extract features synchronously (for prediction without DB lookups)"""
        try:
            details = event.get("details", {})
            ml_context = event.get("ml_context", {})
            source_ip = event.get("source_ip", "0.0.0.0")
            
            # Use pre-computed ML context if available
            type_rarity = ml_context.get("type_rarity", 0.5)
            ip_rarity = ml_context.get("ip_rarity", 0.5)
            event_freq = ml_context.get("event_frequency", 0)
            payload_entropy = ml_context.get("payload_entropy", 0.5)
            
            # Severity score
            severity_map = {"low": 0.25, "medium": 0.5, "high": 0.75, "critical": 1.0}
            severity_score = severity_map.get(event.get("severity", "low"), 0.25)
            
            # Hour of day
            from datetime import datetime
            timestamp = event.get("timestamp", "")
            try:
                if isinstance(timestamp, str):
                    dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                else:
                    dt = datetime.utcnow()
                hour_normalized = dt.hour / 24.0
            except:
                hour_normalized = 0.5
            
            # IP last octet
            try:
                last_octet = int(source_ip.split(".")[-1]) / 255.0
            except:
                last_octet = 0.5
            
            # Port (normalized)
            port = details.get("port", 0)
            port_normalized = min(port / 65535.0, 1.0)
            
            # Bytes (normalized)
            bytes_val = details.get("bytes", 0)
            bytes_normalized = min(bytes_val / 100000.0, 1.0)
            
            # Details complexity
            details_complexity = min(len(str(details)) / 1000.0, 1.0)
            
            # Normalize frequency (cap at 100)
            freq_normalized = min(event_freq / 100.0, 1.0)
            
            return [
                type_rarity,
                ip_rarity,
                freq_normalized,
                payload_entropy,
                severity_score,
                hour_normalized,
                last_octet,
                port_normalized,
                bytes_normalized,
                details_complexity
            ]
            
        except Exception as e:
            print(f"[ML] Sync feature extraction error: {e}")
            return None


# Global ML detector instance
ml_detector = MLAnomalyDetector()
