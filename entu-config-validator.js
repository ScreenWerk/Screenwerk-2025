class EntuValidator {
    constructor(entu_object, entu_model) {
        this.entu_object = entu_object || {}
        this.entu_model = entu_model || {
            type: 'sw_screen_group',
            fields: [], properties: [], relations: []
        }
        this.errors = []
        this.warnings = []
    }

    validate() {
        if (!this.entu_object || Object.keys(this.entu_object).length === 0) {
            this.errors.push('Empty object is invalid by default')
            return this.getResult()
        }
        // console.log(JSON.stringify(this.configuration, null, 2))

        this.validateBasicStructure()
        this.validateProperties()
        this.validateRelations()
        
        return this.getResult()
    }

    validateBasicStructure() {
        const required = this.entu_model.fields
        required.forEach(field => {
            if (!this.entu_object[field]) {
                this.errors.push(`Missing required field: ${field}`)
            }
        })

        if (this.entu_object._type[0]?.string !== this.entu_model.type) {
            this.errors.push(`Invalid entity type: Must be ${this.entu_model.type}`)
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
            isValid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        }
    }
}

class EntuDeepValidator {
    constructor(configuration) {
        const model = {
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
                properties: ['name'], 
                relations: ['media']
            }
        }
    }
}
