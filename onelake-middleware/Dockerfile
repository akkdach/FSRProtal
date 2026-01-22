FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage cache
COPY package.json package-lock.json ./

# Install dependencies
# Using --omit=dev for production optimization, though for a scratch project install all is safer
RUN npm install

# Copy source code
COPY . .

# Expose the application port
EXPOSE 3005

# Start the application
CMD ["npm", "start"]
