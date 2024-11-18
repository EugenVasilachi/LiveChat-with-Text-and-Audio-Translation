FROM python:3.11-slim

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8080

CMD ["gunicorn", "-b", "0.0.0.0:8080", "main:app"]

# (frontend) docker build --no-cache -t livechat-react-app .
# (backend) docker build --no-cache -t livechat-flask-app .