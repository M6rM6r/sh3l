FROM python:3.11-slim

WORKDIR /app

# System deps for scipy/numpy
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgomp1 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Output directory for trained models
RUN mkdir -p /models

ENV MODEL_PATH=/models
ENV PYTHONUNBUFFERED=1

CMD ["python", "train_initial_models.py"]


