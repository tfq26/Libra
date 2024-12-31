#!/bin/bash

# Replace these values with your API details
API_URL="https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyD3umWby_2d9SLjUh-6PLtWjiM_bzYrTWw"
API_KEY="AIzaSyD3umWby_2d9SLjUh-6PLtWjiM_bzYrTWw"
QUERY="Hello, Gemini!"

# Send the request
curl -X POST "$API_URL" \
-H "Authorization: Bearer $API_KEY" \
-H "Content-Type: application/json" \
-d "{\"query\":\"$QUERY\"}"
