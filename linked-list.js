class Node {
  constructor(data) {
    this.data = data
    this.next = null
  }
}

class LinkedList {
  constructor() {
    this.head = null
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
    this.size++
  }

  // Remove a node
  remove(data) {
    let current = this.head
    let prev = null

    while (current !== null) {
      if (current.data === data) {
        if (prev === null) {
          this.head = current.next
        } else {
          prev.next = current.next
        }
        this.size--
        return current.data
      }
      prev = current
      current = current.next
    }
    return null
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

export { LinkedList }