# Codecov VS Code Extension

Welcome to the Codecov VS Code extension! This tool can improve your development workflows by bringing Codecov line coverage and YAML validation directly into Visual Studio Code.

## Coverage Decorations

![Coverage demo](/media/coverage.png)

This feature allows you to visualize coverage data directly in your code editor with line-by-line coverage decorations. Follow these steps to configure this feature:

1. Install the extension:
   - Open Visual Studio Code.
   - Navigate to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window.
   - Search for Codecov and install the extension.
1. Generate a Codecov API key:
   - Go to the [Codecov app](https://app.codecov.io).
   - Log in to your account and navigate to your account settings.
   - Generate an API key under the Access tab.
1. Enter the API key:
   - After installing the extension, you will be prompted to enter your Codecov API key in VS Code. Enter the key you generated in the previous step.

Now, you should see coverage information in the left side gutter of your editor, making it easier to identify untested parts of your code, right from VS Code.

Note that as of today, this feature only pulls coverage data that has been uploaded to Codecov. It is not yet able to use local coverage files. We do understand this limitation and have plans to add support for local coverage in the future!

### Customization Options

In the extensions settings, we provide the following customization options for the coverage feature:

- Select git provider: By default, this extension integrates with GitHub. For other providers, such as GitLab or Bitbucket, select your preferred Git provider within the settings. We also support the self-hosted/enterprise variants of each of these.
- Custom colors: Tailor the appearance of coverage decorations by setting custom colors.
- Self-hosted API URL: If you're using a self-hosted Codecov instance, you can customize the API URL within the extension settings to connect to your server.

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

If you run into issues with any of the extension's features, please don't hesitate to get in touch by [submitting an issue](https://github.com/codecov/vscode/issues). We will do our best to get back to you quickly!
