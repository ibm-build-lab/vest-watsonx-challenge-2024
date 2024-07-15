# VEST watsonx challenge 2024

Built using Node + ChromaDB + +LangChain + watsonx.ai

## Getting started

You will first need to start by populating a `.env` file with some environment variables before running the script. The file should look like:

```sh
# chroma settings
ALLOW_RESET=TRUE

# watsonx settings
WATSONX_AI_AUTH_TYPE=iam
WATSONX_AI_APIKEY=<insert_key_here>
WATSONX_AI_PROJ_ID=<insert_project_id_here>
```

Once those are set you can begin by installing the dependencies needed to run the script. This can be done via:

```sh
npm ci
```

> This will also run the npm `preinstall` script which will install the ChromaDB dependency from Python. Make sure you have Python installed.

This script uses a ChromaDB connector by default to store embeddings. Because of this an instance of the database must be running locally before running the script itself. To start the local ChromaDB server run:

```sh
npm run chroma
```

This will start an instance of the server locally. Then in a seperate terminal you can continually run the script via:

```sh
npm start
```

Each time the script is ran the contents of the ChromaDB instance is reset.

> Hence the need for the `ALLOW_RESET` environment variable.

### Document sourcing

By default, documents sourced for embedding generation come from `./docs/.*md` (relative to project root) and are found via `fast-glob`. Documents must be located here in order to be sourced and inserted into the database.

### Embedding generation

This script will chunk the Markdown input via LangChain and then run them through the embeddings generation API available via watsonx.ai. The resulting vectors are then inserted into the ChromaDB instance so they can be search later.





