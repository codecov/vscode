import json
from functools import reduce

from user_schema import schema

default_description = ""

descriptions = {}
with open(file="descriptions.json", mode="r") as data_file:
    descriptions = json.load(data_file)

def convert_value(value):
    if value == "dict":
        value = "object"
    elif value == "list":
        value = "array"
    return value

def convert_values_dict(dictionary):
    new_dict = {}
    for key in dictionary:
        new_dict[key] = convert_value(dictionary[key])
    return new_dict

def convert_values_list(list):
    new_list = []
    for item in list:
        new_list.append(convert_value(item))
    return new_list

def convert_keys_dict(dictionary):
    new_dict = {}
    for key in dictionary:
        if key == "regex":
            new_dict["pattern"] = dictionary[key]
        elif key == "schema":
            new_dict["properties"] = dictionary[key]
        elif key == "allowed":
            new_dict["enum"] = dictionary[key]
        else:
            new_dict[key] = dictionary[key]
    return new_dict

def get_data(key, location):
    # get description if available
    location.pop(0)
    location.append(key)
    key = ".".join(location)

    try:
        return descriptions[key]
    except KeyError:
        return None

def modify_annotate(dictionary, key, location):
    if isinstance(dictionary, dict):
        # get description if available
        data = get_data(key, location)
        
        title = key
        if data and "title" in data and data["title"] != None:
            title = data["title"]
        title = title[0].upper() + title[1:]
        title = title.replace("_", " ")
        
        description = default_description
        if data and "desc" in data and data["desc"] != None:
            description = data["desc"]

        modified = {
            "title": title,
            "description": description
        }

        return {**dictionary, **modified}
    return dictionary

def modify_type(dictionary):
    new_dictionary = dictionary
    if isinstance(dictionary, dict):
        # if no type match default to string
        type = "string"
        if "type" in dictionary:
            type = dictionary["type"]
        if type == None:
            type = "null"

        modified = {
            **new_dictionary,
            "type": type,
        }

        if "type" in modified:
            # if type is array, move properties to items
            if modified["type"] == "array":
                if "properties" in modified:
                    modified["items"] = modified["properties"]
                    del modified["properties"]
            # Remove properties if type is string and properties only contains type
            if modified["type"] == "string":
                if "properties" in modified and modified["properties"].keys() == ["type"]:
                    del modified["properties"]
            # Because of cerberus weirdness, replace type boolean with enum for boolean values and "yes" and "no".
            if modified["type"] == "boolean":
                modified["enum"] = [
                    True,
                    False,
                    "yes",
                    "no",
                    "on",
                    "off"
                ]
                del modified["type"]

        return modified
    return dictionary

def modify_schema(schema, parent_node="root"):
    # print(parent_node)

    if isinstance(schema, dict):
        for key in schema:
            if isinstance(schema[key], str):
                return schema

            modified = schema[key]
            modified = modify_annotate(modified, key, parent_node.split("."))  
            modified = modify_type(modified)

            if "properties" in modified:
                modified_properties = modified["properties"]
                modified_properties = modify_schema(modified_properties, parent_node + "." + key)
                modified["properties"] = modified_properties

            if "items" in modified:
                def iterate(item):
                    new_item = modify_schema(modified["items"][item], parent_node + "." + key)
                    return new_item
                if "properties" in modified["items"]:
                    del modified["items"]["type"]
                    modified["prefixItems"] = list(map(iterate, modified["items"]))
                    del modified["items"]
                    modified["prefixItems"] = "todo"

            schema[key] = modified

        return schema
    return schema


def recurse(value):
    if isinstance(value, dict):
        for key in value:
            if isinstance(value[key], dict):
                value[key] = convert_keys_dict(value[key])
                value[key] = convert_values_dict(value[key])
                value[key] = recurse(value[key])
            elif isinstance(value[key], list):
                value[key] = convert_values_list(value[key])
                value[key] = recurse(value[key])
            else:
                value[key] = convert_value(value[key])
        return value
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                item = convert_keys_dict(item)
                item = convert_values_dict(item)
                item = recurse(item)
            elif isinstance(item, list):
                item = convert_values_list(item)
                item = recurse(item)
            else:
                item = convert_value(value)
        return value
    else:
        return value

# todo needs to convert anyof list to type items, handle custom coreases correctly
def format(schema):
    formatted = recurse(schema)
    formatted = modify_schema(formatted)

    return formatted


schema = {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "id": "https://json.schemastore.org/codecov",
    "title": "Codecov configuration file",
    "description": "The Codecov configuration file is used to configure your Codecov experience. More info: https://docs.codecov.com/docs/codecov-yaml",
    "type": "object",
    "properties": format(schema)
}
