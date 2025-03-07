class Node {
  constructor(data) {
    this.data = data
    this.next = null
  }
}

export class LinkedList {
  constructor() {
    this.head = null
    this.current = null
    this.size = 0
  }

  // Add a node immediately after the head
  add(data) {
    let node = new Node(data)

    if (this.head === null) {
      this.head = node
      this.head.next = this.head // Make it circular
    } else {
      node.next = this.head.next
      this.head.next = node
    }
    this.current = node.data
    this.size++
  }

  // Remove current node
  remove() {
    if (this.head === null) {
      return null
    }

    if (this.size === 1) {
      this.head = null
      this.size--
      return 0
    }

    // let current = this.head // 
    let previous = this.head
    while (previous.next !== this.head) {
      previous = previous.next
    }

    previous.next = this.head.next
    this.head = previous.next
    this.size--
    return this.size
  }

  // Return current node and move head to the next node
    next() {
        if (this.head === null) {
            return null
        }
        const node = this.head
        this.head = this.head.next
        return node.data
    }

  // Print the list
  printList() {
    let current = this.head
    let str = ""
    while (current) {
      str += current.data + " "
      current = current.next
    }
    console.log(str)
  }
}

// For backward compatibility with non-module scripts
if (typeof window !== 'undefined') {
    window.LinkedList = LinkedList
}