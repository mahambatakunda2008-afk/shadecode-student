import type { CodeLabLanguage, CodeLabProjectType } from "./environments";

export type CodeLabTemplateFile = {
  path: string;
  language: CodeLabLanguage;
  content: string;
};

export type CodeLabProjectTemplate = {
  id: string;
  label: string;
  projectType: CodeLabProjectType;
  primaryLanguage?: CodeLabLanguage;
  description: string;
  curriculumTags: string[];
  files: CodeLabTemplateFile[];
};

export const CODE_LAB_PROJECT_TEMPLATES: CodeLabProjectTemplate[] = [
  {
    id: "javascript-console",
    label: "JavaScript Console App",
    projectType: "console",
    primaryLanguage: "javascript",
    description: "A small multi-file console project for programming and debugging practice.",
    curriculumTags: ["programming", "algorithms"],
    files: [
      { path: "main.js", language: "javascript", content: "function main() {\n  console.log(\"Hello, Shadecode!\");\n}\n\nmain();\n" },
      { path: "utils.js", language: "javascript", content: "export function greet(name) {\n  return `Hello, ${name}!`;\n}\n" },
      { path: "README.md", language: "markdown", content: "# Console Project\n\nWrite, run, debug and explain your solution.\n" },
    ],
  },
  {
    id: "python-console",
    label: "Python Console App",
    projectType: "console",
    primaryLanguage: "python",
    description: "A Python project ready for algorithm and problem-solving work.",
    curriculumTags: ["programming", "algorithms", "problem-solving"],
    files: [
      { path: "main.py", language: "python", content: "def main():\n    print(\"Hello, Shadecode!\")\n\nif __name__ == \"__main__\":\n    main()\n" },
      { path: "README.md", language: "markdown", content: "# Python Console Project\n\nWrite, run, test and debug your solution.\n" },
    ],
  },
  {
    id: "csharp-console",
    label: "C# Console App",
    projectType: "console",
    primaryLanguage: "csharp",
    description: "A real .NET console project shape. Execution is delegated to the future .NET runtime.",
    curriculumTags: ["programming", "oop", "software-development"],
    files: [
      { path: "Program.cs", language: "csharp", content: "Console.WriteLine(\"Hello, Shadecode!\");\n" },
      { path: "ShadecodeConsole.csproj", language: "xml" as CodeLabLanguage, content: "<Project Sdk=\"Microsoft.NET.Sdk\">\n  <PropertyGroup>\n    <OutputType>Exe</OutputType>\n    <TargetFramework>net8.0</TargetFramework>\n    <ImplicitUsings>enable</ImplicitUsings>\n    <Nullable>enable</Nullable>\n  </PropertyGroup>\n</Project>\n" },
    ],
  },
  {
    id: "vbnet-console",
    label: "Visual Basic Console App",
    projectType: "console",
    primaryLanguage: "vbnet",
    description: "A real .NET Visual Basic console project shape for school and desktop programming work.",
    curriculumTags: ["visual-basic", "programming", "problem-solving"],
    files: [
      { path: "Program.vb", language: "vbnet", content: "Module Program\n    Sub Main()\n        Console.WriteLine(\"Hello, Shadecode!\")\n    End Sub\nEnd Module\n" },
      { path: "ShadecodeConsole.vbproj", language: "xml" as CodeLabLanguage, content: "<Project Sdk=\"Microsoft.NET.Sdk\">\n  <PropertyGroup>\n    <OutputType>Exe</OutputType>\n    <TargetFramework>net8.0</TargetFramework>\n    <RootNamespace>ShadecodeConsole</RootNamespace>\n  </PropertyGroup>\n</Project>\n" },
    ],
  },
  {
    id: "csharp-windows-forms",
    label: "C# Windows Forms App",
    projectType: "windows-forms",
    primaryLanguage: "csharp",
    description: "Desktop form project shape with a form, controls and event-driven code.",
    curriculumTags: ["gui", "event-driven-programming", "windows"],
    files: [
      { path: "Program.cs", language: "csharp", content: "using System;\nusing System.Windows.Forms;\n\nApplicationConfiguration.Initialize();\nApplication.Run(new MainForm());\n" },
      { path: "MainForm.cs", language: "csharp", content: "using System.Windows.Forms;\n\npublic class MainForm : Form\n{\n    private readonly Button helloButton = new() { Text = \"Say hello\", Dock = DockStyle.Top };\n\n    public MainForm()\n    {\n        Text = \"Shadecode Windows Forms\";\n        helloButton.Click += (_, _) => MessageBox.Show(\"Hello, Shadecode!\");\n        Controls.Add(helloButton);\n    }\n}\n" },
      { path: "ShadecodeForms.csproj", language: "xml" as CodeLabLanguage, content: "<Project Sdk=\"Microsoft.NET.Sdk\">\n  <PropertyGroup>\n    <OutputType>WinExe</OutputType>\n    <TargetFramework>net8.0-windows</TargetFramework>\n    <UseWindowsForms>true</UseWindowsForms>\n    <ImplicitUsings>enable</ImplicitUsings>\n    <Nullable>enable</Nullable>\n  </PropertyGroup>\n</Project>\n" },
    ],
  },
  {
    id: "vbnet-windows-forms",
    label: "VB.NET Windows Forms App",
    projectType: "windows-forms",
    primaryLanguage: "vbnet",
    description: "Visual Basic desktop form project shape with controls and event-driven code.",
    curriculumTags: ["visual-basic", "gui", "event-driven-programming", "windows"],
    files: [
      { path: "Program.vb", language: "vbnet", content: "Imports System.Windows.Forms\n\nModule Program\n    <STAThread>\n    Sub Main()\n        ApplicationConfiguration.Initialize()\n        Application.Run(New MainForm())\n    End Sub\nEnd Module\n" },
      { path: "MainForm.vb", language: "vbnet", content: "Imports System.Windows.Forms\n\nPublic Class MainForm\n    Inherits Form\n\n    Private ReadOnly helloButton As New Button With {.Text = \"Say hello\", .Dock = DockStyle.Top}\n\n    Public Sub New()\n        Text = \"Shadecode Windows Forms\"\n        AddHandler helloButton.Click, Sub() MessageBox.Show(\"Hello, Shadecode!\")\n        Controls.Add(helloButton)\n    End Sub\nEnd Class\n" },
      { path: "ShadecodeForms.vbproj", language: "xml" as CodeLabLanguage, content: "<Project Sdk=\"Microsoft.NET.Sdk\">\n  <PropertyGroup>\n    <OutputType>WinExe</OutputType>\n    <TargetFramework>net8.0-windows</TargetFramework>\n    <UseWindowsForms>true</UseWindowsForms>\n  </PropertyGroup>\n</Project>\n" },
    ],
  },
  {
    id: "web",
    label: "Web Project",
    projectType: "web",
    primaryLanguage: "html",
    description: "A browser project with HTML, CSS and JavaScript and a live-preview target.",
    curriculumTags: ["web-design", "web-development"],
    files: [
      { path: "index.html", language: "html", content: "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n    <title>Shadecode Web Project</title>\n    <link rel=\"stylesheet\" href=\"styles.css\" />\n  </head>\n  <body>\n    <main>\n      <h1>Hello, Shadecode!</h1>\n      <button id=\"hello\">Test interaction</button>\n    </main>\n    <script src=\"script.js\"></script>\n  </body>\n</html>\n" },
      { path: "styles.css", language: "css", content: "body { font-family: system-ui, sans-serif; margin: 3rem; }\n" },
      { path: "script.js", language: "javascript", content: "document.querySelector(\"#hello\")?.addEventListener(\"click\", () => {\n  console.log(\"Interaction works\");\n});\n" },
    ],
  },
];
