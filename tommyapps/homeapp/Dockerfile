FROM python:3.8

COPY . /src

WORKDIR /src

# Install dependencies
RUN pip install -r requirements.txt

EXPOSE 3113

# Run the application
CMD ["python", "app.py"] 