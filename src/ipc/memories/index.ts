import {
    bulkCreateMemories,
    createMemory,
    editMemory,
    exportMemories,
    importMemories,
    listMemories,
    removeMemory,
} from "./handlers";

export const memories = {
    listMemories,
    createMemory,
    bulkCreateMemories,
    editMemory,
    removeMemory,
    exportMemories,
    importMemories,
};
