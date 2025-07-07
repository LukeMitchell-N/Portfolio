# Use a base image with QGIS pre-installed (simplifies dependencies)
FROM 3liz/qgis-platform:3.44

# Set environment variables
ENV TZ=UTC
ENV QGIS_PREFIX_PATH=/usr

# Set working directory
WORKDIR /portfolio_app

COPY requirements.txt .

# Set up Python3-pip
SHELL ["/bin/bash", "-c"]
RUN apt update && \
	apt install python3-pip -y

# Expose Flask port
EXPOSE 5000

# Copy the app folder into the container
COPY . /portfolio_app

# Create and enter a python virtual env
RUN \
	#python3 -m venv .venv && \
	#. .venv/bin/activate && \
	python3 -m pip install -r requirements.txt --break-system-packages
	##python3 app.py


# Run the app
#CMD ["python3", "app.py"]
#CMD ["sh"]