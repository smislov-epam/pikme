export {
  setOpenAiApiKey,
  clearOpenAiApiKey,
  hasOpenAiApiKey,
  validateOpenAiApiKey,
  openAiChatCompletion,
  OpenAiAuthError,
  OpenAiRateLimitError,
  OpenAiNetworkError,
} from './openaiClient'

export {
  recognizeGamesFromPhoto,
  recognizeGamesFromFile,
  fileToBase64,
  validateImageFile,
  type RecognizedGame,
  type RecognitionResult,
  type RecognizedGameTile,
  type PhotoRecognitionResult,
  type PhotoRecognitionOptions,
} from './photoRecognition'

export {
  findBggMatch,
  findBggMatchesBatch,
  type BggMatchResult,
} from './bggMatching'
