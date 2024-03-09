## About The Project

This project is a Visual Studio Code extension for [Colang](https://github.com/NVIDIA/NeMo-Guardrails/blob/develop/docs/user_guides/colang-language-syntax-guide.md) language.

Please note that the VScode extension currently under development is in its alpha version. This means that while it is functional to some extent, it may contain bugs, incomplete features, or undergo significant changes in future updates. Your feedback and patience during this stage are greatly appreciated as I work towards enhancing its stability and functionality.

## Features

- Syntax highlight

  ![1709911684305](image/README/1709911684305.png)
- Go to Definition

  ![1709911961521](image/README/1709911961521.png)
- Go to References

  ![1709911723002](image/README/1709911723002.png)
- Find All References

  ![1709911736341](image/README/1709911736341.png)
- Shortcut to comment code

- Outliner

- Rename symbols

## Build & Run

### Prerequisites

- The Visual Studio Code Extension Manager

```sh
npm install -g vsce
```

### Installation

- Clone this project

```sh
git clone https://github.com/genexuslabs/vscode-extension.git
```

After cloning the repository, make sure to navigate to the "colang-lang" directory within the repo to continue with the next steps.

- Install packages

```sh
npm install
```

- Build project

```sh
npm run build
```

### Run

Press F5 in VSCode to run de project "colang-lang"

### Package & Install

- Package extension

```sh
vsce package
```

- Install extension

```sh
code --install-extension .\colang-lang-0.0.1.vsix
```

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Additional Information

This project comes with no warranties or guarantees of any kind. While we strive for accuracy and reliability, users are advised to use the software at their own risk. We disclaim any liability for any damages or losses incurred from the use or inability to use this software. Users are encouraged to review the project's documentation and contribute to its improvement through feedback and contributions.
