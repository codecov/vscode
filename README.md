# Codecov VS Code Extension

Welcome to the Codecov VS Code extension! This powerful tool can improve your development workflows by integrating Codecov's line-by-line coverage insights and YAML validation into Visual Studio Code.

## Line-by-line Coverage Decorations

![Coverage demo](/media/coverage.png)

This feature allows you to visualize coverage data directly in your code editor with line-by-line decorations. Follow these steps to configure this feature:

1. Install the Extension:
   - Open Visual Studio Code.
   - Navigate to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window.
   - Search for Codecov and install the extension.
1. Generate a Codecov API Key:
   - Go to the [Codecov app](https://app.codecov.io).
   - Log in to your account and navigate to your account settings.
   - Generate an API key under the Access tab.
1. Enter the API Key:
   - After installing the extension, you will be prompted to enter your Codecov API key in VS Code. Enter the key you generated in the previous step.

Now, you should see coverage information directly within your files, making it easier to identify untested parts of your code, without ever leaving your editor.

Note that as of today, this feature only pulls coverage data that has been uploaded to Codecov. We do not yet hook into local coverage files. We do understand this limitation and have plans to implement this in the future!

### Customization Options

In the extensions settings, we provide the following customization options for the coverage feature:

- Self-hosted API URL: If you're using a self-hosted Codecov instance, you can customize the API URL within the extension settings to connect to your server.
- Select Git Provider: By default, this extension integrates with GitHub. For other providers, such as GitLab or Bitbucket, select your preferred Git provider within the settings. We also support the self-hosted/enterprise variants of each of these.
- Custom Colors: Tailor the appearance of coverage decorations by setting custom colors.

## Codecov YAML Validation

![YAML demo](/media/yaml.gif)

This feature provides validation for Codecov YAML configuration files, offering language server features and helpful hints for different fields. To set this up:

1. Install the extension:
   - Follow the same instructions as in the line-by-line coverage setup to install the Codecov extension.
1. Create or navigate to a codecov.yml file
1. Start editing or validate:
   - Begin editing the codecov.yml file to take advantage of language server features like autocompletion and inline hints.
   - Alternatively, press the Codecov icon in the top right corner of the VS Code window to validate the entire YAML file.

## Having problems?

If you run into any issues with the extension's features, please don't hesitate to get in touch by [submitting an issue](https://github.com/codecov/vscode/issues).
