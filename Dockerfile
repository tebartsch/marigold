FROM python:3.9-alpine

COPY ./README.md /app/README.md
COPY ./setup.py /app/setup.py
WORKDIR /app

RUN pip install .
COPY ./app /app

COPY ./entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
