FROM python:3.8

COPY . /src

WORKDIR /src

# Install dependencies
RUN pip install -r requirements.txt

EXPOSE 3112 

# Run the application
CMD ["python", "app.py"]
