export function findAssetModel(assets, name) {
  const models = assets?.models
  if (!models) return null
  return models.furniture?.[name] || models.nature?.[name] || models[name] || null
}

export function markObjectResourcesPersistent(root) {
  root?.traverse?.(object => {
    if (object.geometry) {
      object.geometry.userData ||= {}
      object.geometry.userData.keep = true
    }
    const materials = object.material
      ? (Array.isArray(object.material) ? object.material : [object.material])
      : []
    for (const material of materials) {
      material.userData ||= {}
      material.userData.keep = true
      for (const value of Object.values(material)) {
        if (value?.isTexture) {
          value.userData ||= {}
          value.userData.keep = true
        }
      }
    }
  })
  return root
}
