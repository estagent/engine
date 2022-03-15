export default function (request, options = {}) {
  const {path, cast, transform, loaders} = options
  const key = 'datum.'.concat(path.replace('/', '.'))
  const items = []

  const loadFromStorage = () => {
    const content = sessionStorage.getItem(key)
    if (content) {
      const data = JSON.parse(content)
      items.length = 0
      for (let item of data) {
        items.push(transform ? transform(item) : item)
      }
      return items.length
    }
  }

  const saveToStorage = data => {
    if (data instanceof Array && data.length) {
      items.length = 0
      for (let item of data) {
        items.push(cast ? cast(item) : item)
      }
      sessionStorage.setItem(key, JSON.stringify(items))
      return items.length
    }
  }

  const itemsExists = () => items instanceof Array && items.length
  const engine = () =>
    new Promise((resolve, reject) => {
      if (itemsExists()) {
        resolve(items.concat())
      } else {
        if (loadFromStorage()) {
          resolve(items.concat())
        } else {
          request
            .get(path)
            .then(data => {
              if (saveToStorage(data)) {
                resolve(items.concat())
              } else {
                reject('engine data invalid')
              }
            })
            .catch(err => reject(err))
        }
      }
    })

  return Object.assign(loaders ?? {}, {
    all: engine,
    find: async function (value) {
      return await engine().then(items => {
        for (let item of items) {
          if (Number.isInteger(value)) {
            if (item.id === value) {
              return item
            }
          } else if (item.code === value) {
            return item
          }
        }
      })
    },
    code: async function (value) {
      return (await this.find(value)?.code) ?? null
    },
    id: async function (value) {
      return (await this.find(value)?.id) ?? null
    },
    codes: async function () {
      return await engine().then(items => items.map(item => item['code']))
    },
    clear: function () {
      sessionStorage.removeItem(key)
    },
  })
}
