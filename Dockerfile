# Use a base image with QGIS pre-installed (simplifies dependencies)
FROM 3liz/qgis-platform:3.44

# Set environment variables
ENV TZ=UTC
ENV QGIS_PREFIX_PATH=/usr

# Set up Python3-pip
SHELL ["/bin/bash", "-c"]
RUN apt update && \
	apt install -y  \
		python3-pip \
		git			\
		vim			\
		gh 

COPY . /portfolio_app

# Create and enter a python virtual env
RUN python3 -m pip install -r ./portfolio_app/requirements.txt --break-system-packages

# Set working directory
WORKDIR /portfolio_app

# Expose Flask port
EXPOSE 5000