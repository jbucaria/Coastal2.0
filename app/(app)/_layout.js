import React from 'react'
import { Stack } from 'expo-router'

const _layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // default: hide header for all screens
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="TicketDetailsScreen" />
      <Stack.Screen name="InspectionScreen" />
      <Stack.Screen name="CreateTicketScreen" />
      <Stack.Screen name="ViewReport" />
      <Stack.Screen name="TicketNotesScreen" />
      <Stack.Screen name="RemediationScreen" />
      <Stack.Screen name="FeedBackScreen" />
      {/* <Stack.Screen name="EditRemediationScreen" /> */}
      <Stack.Screen name="ViewRemediationScreen" />
      <Stack.Screen name="ButtonSampleScreen" />
      <Stack.Screen name="AddTicketScreen" />
      <Stack.Screen name="ScheduleReturnDetailsScreen" />
      <Stack.Screen
        name="EditRemediationScreen"
        options={{ headerShown: true, headerTitle: 'Edit Remediation' }}
      />
      <Stack.Screen name="EditReportScreen" />
      {/* Manager Return Scheduler */}
      <Stack.Screen
        name="ReturnScheduleScreen"
        options={{ headerShown: true, headerTitle: 'Return Schedule' }}
      />
    </Stack>
  )
}

export default _layout
