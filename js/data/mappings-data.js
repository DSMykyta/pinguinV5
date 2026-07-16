// js/data/mappings-data.js

/**
 * SHARED DATA - MAPPINGS CRUD & AUTOMAP
 *
 * Facade for mapping data operations. Implementation is split by domain.
 */

export {
    getMapCategories,
    getMapCharacteristics,
    getMapOptions,
    setMapCategories,
    setMapCharacteristics,
    setMapOptions
} from './mappings-state.js';

export {
    loadMapCategories,
    loadMapCharacteristics,
    loadMapOptions
} from './mappings-load.js';

export {
    isMpCategoryMapped,
    getMappedMpCategories,
    createCategoryMapping,
    deleteCategoryMapping,
    deleteCategoryMappingByMpId,
    batchCreateCategoryMapping
} from './mappings-categories.js';

export {
    isMpCharacteristicMapped,
    getMappedMpCharacteristics,
    getCharacteristicMappingByMpId,
    createCharacteristicMapping,
    deleteCharacteristicMapping,
    deleteCharacteristicMappingByMpId,
    batchCreateCharacteristicMapping
} from './mappings-characteristics.js';

export {
    isMpOptionMapped,
    getMappedMpOptions,
    getOptionMappingByMpId,
    createOptionMapping,
    deleteOptionMapping,
    deleteOptionMappingByMpId,
    batchCreateOptionMapping
} from './mappings-options.js';

export {
    autoMapCharacteristics,
    autoMapOptions
} from './mappings-automap.js';
