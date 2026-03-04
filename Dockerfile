# Base image with both Python and Node.js
FROM nikolaik/python-nodejs:python3.11-nodejs18

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Install Node dependencies
COPY package*.json .
RUN npm install

# Copy all source files
COPY . .

# Start the scheduler
CMD ["npx", "ts-node", "scheduler.ts"]