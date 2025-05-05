const CustomButton = ({ title, onPress, disabled }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: '#2b6cb0',
        padding: 10,
        borderRadius: 8,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 16 }}> </Text>
    </Pressable>
  )
}
