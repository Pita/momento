# Momento

## Goal

The goal is it to have a web app which that helps you write diary entries and gives you helpful guidance for your life using LLMs. The goal is to have it privacy first, with just local LLMs thanks to ollama. This creates some interesting design challenges as only small LLMs with short context windows can be used.

## Tech stack

- Next.js (Typescript, TailwindCSS)
- Ollama for LLMs
- File based DB

## Planned features:

- Different agents for different aspects of a happy and fullfilled life
- Backup possibility to Dropbox / Google Drive via encrypted files
- Maybe memory retrival using a vector db
- Maybe voice mode via local TTS and STT (could talk to it on a walk)

## Install

**Important: This is a work in progress, the DB might change in incompatible ways.**
## Prerequisite
```
npm
```

### Debian/Ubuntu
```
  sudo apt-get install ollama
  echo llama3.1 llama3.2 deepseek-r1 | xargs -n1 ollama pull
  git clone https://github.com/Pita/momento.git
  cd momento/next.js; npm install; npm run dev
```
### MacOS
```
  brew install ollama
  echo llama3.1 llama3.2 deepseek-r1 | xargs -n1 ollama pull
  git clone https://github.com/Pita/momento.git
  cd momento/next.js; npm install; npm run dev
```
### Windows

  Install https://ollama.com/download/OllamaSetup.exe
```
  ollama pull llama3.1 
  ollama pull llama3.2
  ollama pull deepseak-r1
  git clone https://github.com/Pita/momento.git
  cd momento/next.js
  npm install
  npm run dev
```

## Usage

Visit http://localhost:3000
