# Use a base image with QGIS pre-installed (simplifies dependencies)
FROM 3liz/qgis-platform:3.28

# Set environment variables
ENV TZ=UTC
ENV QGIS_PREFIX_PATH=/usr

# Set up Python3-pip
SHELL ["/bin/bash", "-c"]
RUN apt update && \
	apt install -y  \
		python3-pip \
		vim						
	
COPY app.py processing requirements.txt static templates /portfolio_app


RUN python3 -m venv .venv &&
	source .venv/bin/activate

# Configure python libraries
RUN python3 -m pip install -r ./portfolio_app/requirements.txt  --ignore-installed

# Set working directory
WORKDIR /portfolio_app

# Expose Flask port
EXPOSE 5000