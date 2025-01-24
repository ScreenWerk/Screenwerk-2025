class EntuValidator {
    constructor(entu_object, entity_type, entu_model) {
        this.entu_object = entu_object || {}
        if (!this.entu_object || Object.keys(this.entu_object).length === 0) {
            this.errors.push('Empty object cant be validated')
            return this.getResult()
        }

        this.entity_type = entity_type
        this.entu_model = entu_model || {
            type: 'sw_screen_group',
            fields: [], properties: [], relations: []
        }
        this.errors = []
        this.warnings = []
    }

    validate() {
        this.validateBasicStructure()
        this.validateProperties()
        this.validateRelations()
        
        return this.getResult()
    }

    validateBasicStructure() {
        const default_fields = ['_id', '_type']
        const required = [...new Set(this.entu_model.fields.concat(default_fields))]
        required.forEach(field => {
            if (!this.entu_object[field]) {
                this.errors.push(`Missing required field: ${field}`)
            }
        })

        if (this.entu_object._type[0]?.string !== this.entity_type) {
            this.errors.push(`Invalid entity type: Must be ${this.entity_type}`)
        }
    }

    validateProperties() {
        const properties = this.entu_object || {}
        const required = this.entu_model.properties

        required.forEach(prop => {
            if (!properties[prop] || !properties[prop].length) {
                this.errors.push(`Missing required property: ${prop}`)
            }
        })
    }

    validateRelations() {
        const relations = this.entu_object || {}
        const required = this.entu_model.relations

        required.forEach(rel => {
            if (!relations[rel] || !relations[rel].length || !relations[rel][0].reference) {
                this.errors.push(`Missing required relation: ${rel}`)
            }
        })
    }

    getResult() {
        return {
            id: this.entu_object._id,
            model_type: this.entu_model.type,
            entity_type: this.entu_object._type[0].string,
            isValid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        }
    }
}

const fetchFromEntu = async (eid) => {
    const u = `${ENTU_ENTITY_URL}/${eid}`
    const entity = (await fetchJSON(u)).entity
    return entity
}

const fetchChildsOf = async (eid, child_type) => {
    const url = `${ENTU_ENTITY_URL}?_type.string=${child_type}&_parent.reference=${eid}`
    const childs = (await fetchJSON(url)).entities
    return childs
}

class EntuDeepValidator {
    constructor() {
        this.model = {
            sw_screen_group: {
                fields: ['_id'], 
                properties: ['name'], 
                relations: ['configuration']
            },
            sw_configuration: {
                fields: ['_id'], 
                properties: ['name'], 
                childs: ['sw_schedule']
            },
            sw_schedule: {
                fields: ['_id'], 
                properties: ['name','crontab', 'cleanup'], 
                relations: ['layout']
            },
            sw_layout: {
                fields: ['_id'], 
                properties: ['name'], 
                childs: ['sw_layout_playlist']
            },
            sw_layout_playlist: {
                fields: ['_id'], 
                properties: ['name','left','top','width','height'], 
                relations: ['playlist']
            },
            sw_playlist: {
                fields: ['_id'], 
                properties: ['name'], 
                childs: ['sw_playlist_media']
            },
            sw_playlist_media: {
                fields: ['_id'], 
                properties: ['name'], 
                relations: ['media']
            },
            sw_media: {
                fields: ['_id'], 
                properties: ['name', 'file', 'type']
            }
        }
        this.errors = []
        this.warnings = []
    }

    async validate(eid) {
        const entity = await fetchFromEntu(eid)
        const entity_type = entity._type[0].string
        const model = this.model[entity_type]

        if (!model) {
            return {
                isValid: false,
                errors: [`Unknown entity type: ${entity_type}`]
            }
        }

        if (model.childs) {
            model.childs.forEach(async child_type => {
                const childs = await fetchChildsOf(eid, child_type)
                childs.forEach(async child => {
                    const child_validation = await this.validate(child._id)
                    this.errors.push(...child_validation.errors)
                    this.warnings.push(...child_validation.warnings)
                })
            })
        }

        const validator = new EntuValidator(entity, entity_type, model)
        const result = await validator.validate()
        // console.log(result)
        this.errors.push(...result.errors)
        this.warnings.push(...result.warnings)
        
        return this.getResult()
    }

    getResult() {
        return {
            isValid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        }
    }
}
