// Disclaimer: no semicolons, if unnecessary, are used in this project

export function extendLinkedList(LinkedList) {
    LinkedList.prototype.first = function() {
        if (this.head) {
            this.current = this.head
            return true
        }
        return false
    }

    LinkedList.prototype.next = function() {
        if (this.current && this.current.next) {
            this.current = this.current.next
            return true
        } else if (this.current) {
            // Always loop back to the first item - removed conditional check for shouldLoop
            // since we always want playlists to loop
            this.current = this.head
            return true
        }
        return false
    }

    LinkedList.prototype.add = function(item) {
        const node = { value: item, next: null }
        if (!this.head) {
            this.head = node
            this.current = node
        } else {
            let tail = this.head
            while (tail.next) {
                tail = tail.next
            }
            tail.next = node
        }
    }
    
    // Add a method to get the current node's value
    LinkedList.prototype.getCurrent = function() {
        if (this.current) {
            return this.current.value
        }
        return null
    }
}
