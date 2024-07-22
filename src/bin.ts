#!/usr/bin/env node

import { ChromaClient } from 'chromadb';
import { WatsonXAI } from '@ibm-cloud/watsonx-ai';
import fg from 'fast-glob';
import fs from 'fs';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import readline from 'readline/promises';
import chalk from 'chalk';

const CHROMA = new ChromaClient();
const PROMPT = fs.readFileSync('./src/prompt.txt').toString();
const WX = WatsonXAI.newInstance({
  version: '2024-05-31',
  serviceUrl: 'https://us-south.ml.cloud.ibm.com'
});
const TEXT_SPLITTER = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
  chunkSize: 500,
  chunkOverlap: 25
});

await CHROMA.reset();
const collection = await CHROMA.createCollection({ name: 'test-from-js' });

/**
 * Generate embeddings for given text
 *
 * @param input
 * @returns embeddings
 */
async function createEmbeddings(input: string | string[]) {
  const embeddings = await WX.textEmbeddings({
    parameters: {},
    projectId: process.env.WATSONX_AI_PROJ_ID,
    inputs: Array.isArray(input) ? input : [input],
    modelId: 'ibm/slate-125m-english-rtrvr'
  });

  return embeddings.result.results.map((e) => e.embedding);
}

/**
 * Ingest docs into chromadb
 *
 * @param glob
 */
async function ingestDocuments(glob: string) {
  // iterate over documents
  const files = fg.globSync([glob]);
  await Promise.all(
    files.map(async (filePath: string) => {
      // parse raw text
      const rawFile = fs.readFileSync(filePath).toString();

      // split into chunks
      const splitDocs = await TEXT_SPLITTER.createDocuments([rawFile]);

      // calculate embeddings for chunks
      const embeddings = await createEmbeddings(splitDocs.map((s) => s.pageContent));

      // insert embeddings into db
      await collection.add({
        ids: [...new Array(splitDocs.length)].map((_, idx) => `${filePath}_${idx}`),
        metadatas: [...new Array(splitDocs.length)].map((_) => ({ filePath })),
        embeddings: embeddings,
        documents: splitDocs.map((s) => s.pageContent)
      });
    })
  );
}

await ingestDocuments('./docs/**/*.{md,mdx}');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// eslint-disable-next-line no-constant-condition
while (true) {
  const queryText = await rl.question(chalk.blue(`QUESTION:\n`));

  console.log(`\nLet me check...\n`);

  // generate embeddings for input text and query vector DB
  const queryEmbedding = await createEmbeddings(queryText);
  const queryData = await collection.query({
    queryEmbeddings: queryEmbedding,
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

  console.log(chalk.green(`ANSWER:`));
  console.log(chalk.italic(`${output.result.results[0].generated_text.trim()}\n`));

  console.log('Answer sourced from:');
  queryData.metadatas.flat().forEach((item) => {
    if (item === null) return;
    const { filePath } = item;
    console.log(filePath);
  });
  console.log();
}
