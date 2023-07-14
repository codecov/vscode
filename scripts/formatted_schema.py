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
        elif key == "max":
            new_dict["maximum"] = dictionary[key]
        elif key == "min":
            new_dict["minimum"] = dictionary[key]
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

        modified = {"title": title, "description": description}

        return {**dictionary, **modified}
    return dictionary


def modify_type(dictionary):
    new_dictionary = dictionary
    if isinstance(dictionary, dict):
        # if no type match default to string
        type = "string"
        if "type" in dictionary:
            type = dictionary["type"]

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
                if "properties" in modified and modified["properties"].keys() == [
                    "type"
                ]:
                    del modified["properties"]
            # Because of cerberus weirdness, replace type boolean with enum for boolean values and "yes" and "no".
            if modified["type"] == "boolean":
                modified["enum"] = [True, False, "yes", "no", "on", "off"]
                del modified["type"]
            # if type is a list format must convert to oneOf
            if "type" in modified:
                if isinstance(modified["type"], list):
                    one_of = []
                    for type in modified["type"]:
                        one_of.append({"type": type})
                    dictionary = {}
                    dictionary["oneOf"] = one_of
                    modified = {**dictionary, **modified}

                    del modified["type"]

        # Recreating python functions
        if "coerce" in modified:
            #  Handles: 60...80
            if modified["coerce"] == "string_to_range":
                one_of = []
                one_of.append({"type": "integer"})
                one_of.append({"pattern": "(\\d+)(\\.\\d+)?%?|(\d+)...(\d+)"})
                one_of.append(
                    {
                        "type": "array",
                        "items": [{"type": "integer"}],
                        "minItems": 1,
                        "maxItems": 2,
                    }
                )

                # combine potential existing oneOf
                dictionary = {}
                dictionary["oneOf"] = one_of
                modified = {**dictionary, **modified}
                if "regex" in modified:
                    del modified["regex"]
                if "anyof" in modified:
                    del modified["anyof"]
                if "type" in modified:
                    del modified["type"]
                if "coerce" in modified:
                    del modified["coerce"]
                if "maxlength" in modified:
                    del modified["maxlength"]

            # Handles: 57%
            if "coerce" in modified and modified["coerce"] == "percentage_to_number":
                print(modified)

        if "oneOf" in modified:
            if isinstance(modified["oneOf"], list):
                new_one_of = []
                for type in modified["oneOf"]:
                    formatted_one_of = recurse(type)
                    formatted_one_of = modify_schema(formatted_one_of)
                    formatted_one_of = modify_type(formatted_one_of)
                    new_one_of.append(formatted_one_of)
                modified["oneOf"] = new_one_of

        # if is enum drop string type
        if "enum" in modified and "type" in modified:
            del modified["type"]

        # Unclear what original nullable does but it seems to be default JSON. deleting.
        if "nullable" in modified:
            del modified["nullable"]

        # Must be comma separated
        if "comma_separated_strings" in modified:
            del modified["comma_separated_strings"]
            modified["pattern"] = "^([^,]+)(,[^,]+)*$"

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
                modified_properties = modify_schema(
                    modified_properties, parent_node + "." + key
                )
                modified["properties"] = modified_properties

            if "items" in modified:

                def iterate(item):
                    new_item = modify_schema(
                        modified["items"][item], parent_node + "." + key
                    )
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
    "description": "The Codecov configuration file is used to configure your repository's Codecov experience.",
    "type": "object",
    "properties": format(schema),
}
