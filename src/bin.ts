#!/usr/bin/env node

import { ChromaClient } from 'chromadb';
import { WatsonXAI } from '@ibm-cloud/watsonx-ai';
import fg from 'fast-glob';
import fs from 'fs';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import readline from 'readline/promises';

const CHROMA = new ChromaClient();
const PROMPT = fs.readFileSync('./src/prompt.txt').toString();
const WX = WatsonXAI.newInstance({
  version: '2024-05-31',
  serviceUrl: 'https://us-south.ml.cloud.ibm.com'
});
const TEXT_SPLITTER = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
  chunkSize: 500,
  chunkOverlap: 0
});

await CHROMA.reset();
const collection = await CHROMA.createCollection({ name: 'test-from-js' });

// iterate over documents
const files = fg.globSync(['./docs/**/*.{md,mdx}']);
await Promise.all(
  files.map(async (filePath: string) => {
    // parse raw text
    const rawFile = fs.readFileSync(filePath).toString();

    // split into chunks
    const splitDocs = await TEXT_SPLITTER.createDocuments([rawFile]);

    // calculate embeddings for chunks
    const embeddings = await WX.textEmbeddings({
      parameters: {},
      projectId: process.env.WATSONX_AI_PROJ_ID,
      inputs: splitDocs.map((s) => s.pageContent),
      modelId: 'ibm/slate-125m-english-rtrvr'
    });

    // insert embeddings into db
    await collection.add({
      ids: [...new Array(splitDocs.length)].map((_, idx) => `${filePath}_${idx}`),
      embeddings: embeddings.result.results.map((e) => e.embedding),
      documents: splitDocs.map((s) => s.pageContent)
    });
  })
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// eslint-disable-next-line no-constant-condition
while (true) {
  const queryText = await rl.question(`QUESTION:\n`);

  console.log(`Let me check...`);

  const queryEmbedding = await WX.textEmbeddings({
    parameters: {},
    projectId: process.env.WATSONX_AI_PROJ_ID,
    inputs: [queryText],
    modelId: 'ibm/slate-125m-english-rtrvr'
  });

  const queryData = await collection.query({
    queryEmbeddings: queryEmbedding.result.results[0].embedding,
    queryTexts: [queryText], // Chroma will embed this for you
    nResults: 5
  });

  const output = await WX.textGeneration({
    input: PROMPT.replace('{question}', queryText).replace(
      '{context}',
      queryData.documents.join('\n\n')
    ),
    modelId: 'ibm/granite-13b-chat-v2',
    parameters: {
      decoding_method: 'greedy',
      min_new_tokens: 50,
      max_new_tokens: 200,
      repetition_penalty: 1
    },
    projectId: process.env.WATSONX_AI_PROJ_ID
  });

  console.log(`\nANSWER:\n${output.result.results[0].generated_text.trim()}\n`);
}
