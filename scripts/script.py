import json
from formatted_schema import schema

# Convert the Python dictionary to JSON
json_data = schema

# Save the JSON data to a file
with open('codecov.json', 'w') as f:
    json.dump(json_data, f, indent=4)
 