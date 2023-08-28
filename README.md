![Overview slideshow](/media/4uLz6acpnhnd8SNe37rH.gif)

Create, manage, and validate the codecov.yml right in VS Code with our latest extension. Make sure you don't commit any mistakes and accidentally change Codecov’s behavior due to an invalid configuration.

**Key Features (for now 😉)**

* **PR Configuration in VS Code:** This extension empowers you to configure and enable Codecov directly within Visual Studio Code, eliminating the need for manual setups – ultimately saving you loads of time. 
* **Ease of Use:** The extension is designed for all users, regardless of their familiarity with Codecov or YAML files. You don't need to be an expert to ensure accurate and effective Codecov integration, we’ll help you along the way. Have a particularly complex setup? We’re [here to help](github.com/codecov/feedback). 
* **Real-time Assistance and Validation:** Tired of guesswork? Our extension offers autocomplete and real-time validation for your Codecov YAML file. It can detect errors in the YAML file before creating a pull request ensuring your configuration is spot-on. 

![Validate configuration against Codecov servers](/media/PmGGVqo9jNHEE1yfYW9l.gif)



Here are some quick configurations to get you started:  

**Ease target coverage**

[Relax my coverage target](https://docs.codecov.com/docs/commit-status#threshold), because I have flaky tests


```
codecov.yml

coverage:
  status:
    project:
      default:
        target: auto
        # adjust accordingly based on how flaky your tests are
        # this allows a 10% drop from the previous base commit coverage
        threshold: 10%
```


**Set non-blocking status checks**

See status checks but [prevent them from blocking](https://docs.codecov.com/docs/commit-status#informational)


```
codecov.yml

coverage:
  status:
    project:
      default:
        informational: true
    patch:
      default:
        informational: true
```


**Ensure all code is covered**

Set blocking coverage so [that new code must be fully tested](https://docs.codecov.com/docs/commit-status#patch-status)


```
codecov.yml

coverage:
  status:
    patch:
      default:
        target: 100%
```


This is just the beginning of the Codecov VS Code extension. We plan to keep investing into the extension over time to provide even more of Codecov's functionality directly in your code editor. – if you have ideas to share, questions, or need help don’t hesitate to [let us know](https://github.com/codecov/feedback). 

Get started with our Codecov VS Code extension and unlock a new level of convenience and accuracy in your code coverage setup. Install now.



**Troubleshooting**

Is the extension not working? VS Code might not be detecting Codecov files if a language matching the pattern has been set and is overriding detecting Codecov as a language provider.

![How to set Codecov as the language of a Codecov config file](/media/Codecov%20+%20VSCode%20(Troubleshoot).gif)


If validation is still not working you may need to restart VS Code. If it is still broken you can [report the issue here](https://github.com/codecov/vscode/issues)