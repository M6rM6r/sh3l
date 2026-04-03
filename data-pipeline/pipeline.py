#!/usr/bin/env python3
"""
Event-Driven Data Pipeline with Apache Kafka
Real-time analytics and data warehousing
"""
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

import asyncpg
import aiokafka
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"

@dataclass
class GameEvent:
    event_id: str
    user_id: int
    game_type: str
    event_type: str  # game_started, game_completed, level_completed
    timestamp: str
    data: Dict
    processed: bool = False

class EventProducer:
    def __init__(self):
        self.producer: Optional[AIOKafkaProducer] = None
    
    async def start(self):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        await self.producer.start()
    
    async def stop(self):
        if self.producer:
            await self.producer.stop()
    
    async def send_event(self, topic: str, event: GameEvent):
        await self.producer.send(
            topic,
            value=asdict(event),
            key=str(event.user_id).encode()
        )

class AnalyticsConsumer:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.consumer: Optional[AIOKafkaConsumer] = None
    
    async def start(self):
        self.consumer = AIOKafkaConsumer(
            'game-events',
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id='analytics-group',
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
        await self.consumer.start()
        asyncio.create_task(self._consume())
    
    async def stop(self):
        if self.consumer:
            await self.consumer.stop()
    
    async def _consume(self):
        async for msg in self.consumer:
            event = GameEvent(**msg.value)
            await self._process_event(event)
    
    async def _process_event(self, event: GameEvent):
        async with self.db_pool.acquire() as conn:
            if event.event_type == 'game_completed':
                await conn.execute("""
                    INSERT INTO analytics_game_sessions 
                    (user_id, game_type, score, accuracy, duration, played_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, 
                    event.user_id, 
                    event.game_type,
                    event.data.get('score'),
                    event.data.get('accuracy'),
                    event.data.get('duration'),
                    datetime.fromisoformat(event.timestamp)
                )

class RealTimeMetrics:
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def increment_counter(self, metric_name: str, value: int = 1):
        await self.redis.hincrby('metrics:realtime', metric_name, value)
    
    async def get_metrics(self) -> Dict[str, int]:
        return await self.redis.hgetall('metrics:realtime')
    
    async def record_latency(self, operation: str, latency_ms: float):
        key = f"latency:{operation}"
        await self.redis.lpush(key, latency_ms)
        await self.redis.ltrim(key, 0, 999)  # Keep last 1000
    
    async def get_percentile_latency(self, operation: str, percentile: float = 0.95):
        key = f"latency:{operation}"
        values = await self.redis.lrange(key, 0, -1)
        if not values:
            return None
        values = sorted([float(v) for v in values])
        index = int(len(values) * percentile)
        return values[min(index, len(values) - 1)]

if __name__ == "__main__":
    print("Data Pipeline module ready")
