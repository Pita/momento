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

## Setup

- Setup ollama and pull the models mentioned in src/lib/llmCall.ts
- In the next.js folder run `npm install; npm run dev` then go to http://localhost:3000
