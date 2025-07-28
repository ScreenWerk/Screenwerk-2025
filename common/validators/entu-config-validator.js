class _EntuValidator {
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
                this.errors.push(`Missing required field: ${field} for ${this.entity_type}`)
            }
        })

        if (this.entu_object._type[0]?.string !== this.entity_type) {
            this.errors.push(`Invalid entity type: Must be ${this.entity_type}`)
        }
    }

    validateProperties() {
        const properties = this.entu_object || {}
        const required = this.entu_model.properties || []

        required.forEach(prop => {
            if (!properties[prop] || !properties[prop].length) {
                this.errors.push(`Missing required property: ${prop} for <a href="${ENTU_ENTITY_URL}/${this.entu_object._id}" target="_blank">${this.entity_type}</a>/<a href="${ENTU_FRONTEND_URL}/${this.entu_object._id}" target="_blank">@entu</a>`)
            }
        })
    }

    validateRelations() {
        const relations = this.entu_object || {}
        const required = this.entu_model.relations || []

        required.forEach(rel => {
            if (!relations[rel] || !relations[rel].length || !relations[rel][0].reference) {
                this.errors.push(`Missing required relation: ${rel} for <a href="${ENTU_ENTITY_URL}/${this.entu_object._id}" target="_blank">${this.entity_type}</a>/<a href="${ENTU_FRONTEND_URL}/${this.entu_object._id}" target="_blank">@entu</a>`)
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

const _fetchFromEntu = async (eid) => {
    const u = `${ENTU_ENTITY_URL}/${eid}`
    const entity = (await fetchJSON(u)).entity
    return entity
}

const _fetchChildsOf = async (eid, child_type) => {
    const url = `${ENTU_ENTITY_URL}?_type.string=${child_type}&_parent.reference=${eid}`
    const childs = (await fetchJSON(url)).entities
    return childs
}
