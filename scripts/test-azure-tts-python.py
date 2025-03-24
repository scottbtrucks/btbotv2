#!/usr/bin/env python3

import os
import requests
import datetime
import time

def azure_tts(text, output_file_path='output.wav', voice_name='ru-RU-SvetlanaNeural'):
    """
    Azure TTS function using the exact approach shown by the user
    """
    # Azure subscription key
    subscription_key = "b5e29d9a1fc640c59fdd1a3bb56fc5b4"
    
    # Region of the endpoint
    region = "eastus"
    
    # Set SSML
    ssml = f"""
    <speak version='1.0' xml:lang='ru-RU'>
        <voice name='{voice_name}'>{text}</voice>
    </speak>
    """
    
    # Set endpoint URL
    endpoint = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"
    
    # Set headers
    headers = {
        "Ocp-Apim-Subscription-Key": subscription_key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
        "User-Agent": "PythonTTSTest"
    }
    
    # Send request
    print(f"Sending request to {endpoint}")
    print(f"Text: '{text}'")
    print(f"Voice: {voice_name}")
    print(f"Output format: riff-24khz-16bit-mono-pcm")
    
    response = requests.post(endpoint, headers=headers, data=ssml.encode('utf-8'))
    
    # Check if the request was successful
    if response.status_code == 200:
        print(f"Success! Saving audio to {output_file_path}")
        with open(output_file_path, 'wb') as audio_file:
            audio_file.write(response.content)
        return True
    else:
        print(f"Error: {response.status_code} {response.reason}")
        print(f"Response: {response.text}")
        return False

if __name__ == "__main__":
    # Text to convert
    text = "Привет, я тестирую Azure TTS с Python!"
    
    # Current timestamp for unique filename
    timestamp = int(time.time())
    output_file = f"azure-tts-test-python-{timestamp}.wav"
    
    # Call Azure TTS function
    success = azure_tts(text, output_file)
    
    if success:
        print(f"Audio file saved as {output_file}")
    else:
        print("Failed to generate audio") 