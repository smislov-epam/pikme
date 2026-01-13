// Games service
export {
  getAllGames,
  getGame,
  getGames,
  getStaleGames,
  queryGamesByFilters,
  updateGame,
  upsertGame,
  upsertGames,
} from './gamesService'

// Users service
export {
  createBggUser,
  createLocalUser,
  deleteUser,
  getAllUsers,
  getBggUsers,
  getLocalUsers,
  getOrganizer,
  getUser,
  setUserAsOrganizer,
  updateUserLastSync,
  updateUserOwnedCount,
  upsertUser,
} from './usersService'

// User games service
export {
  addGameToUser,
  getGameOwners,
  getGamesForUsers,
  getUserGameIds,
  getUserGames,
  getUserGamesWithDetails,
  getUserRating,
  removeGameFromUser,
  syncUserCollection,
  updateUserRating,
} from './userGamesService'

// User preferences service
export {
  clearUserPreferences,
  deleteUserPreference,
  getRankedGames,
  getTopPicks,
  getUserPreference,
  getUserPreferences,
  hasExistingPreferences,
  saveUserPreferences,
  setUserPreferenceRanks,
  updateGamePreference,
} from './userPreferencesService'
export type { UserPreferenceInput } from './userPreferencesService'

// Saved nights service
export {
  clearAllSavedNights,
  deleteSavedNight,
  getSavedNight,
  getSavedNights,
  saveNight,
} from './savedNightsService'
