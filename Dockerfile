FROM python:3.8

WORKDIR /app

COPY ./scripts/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./scripts .

CMD [ "python", "./scripts/script.py" ]
