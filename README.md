# Momento

## Goal

Momento is a web app that helps you write journaling entries and provides life guidance using LLMs. Privacy is a core focus, achieved by using local LLMs through Ollama. This creates interesting design challenges since only small LLMs with limited context windows can be used.

## Tech Stack

- Next.js (TypeScript, TailwindCSS)
- Ollama for LLMs
- File-based DB

## Planned Features

- Different agents for various aspects of a happy and fulfilled life
- Encrypted backup to Dropbox / Google Drive
- Potential memory retrieval using a vector database
- Possible voice mode using local TTS and STT (enabling conversations during walks)

## Setup

**Important: This is a work in progress. The database schema may change in incompatible ways.**

- Install Ollama and download the models listed in src/lib/llmCall.ts
- In the Next.js folder, run `npm install; npm run dev` then navigate to http://localhost:3000
