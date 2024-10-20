from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
import openai
import os

# load_dotenv() 
openai.api_key = os.getenv("API_KEY")
model = ChatOpenAI(model="gpt-4o", api_key=os.getenv("API_KEY"))

def translate_text(text, source_lang, target_lang):
    messages = [
        SystemMessage(content="Act like an expert in translation"),
        HumanMessage(
            content=f"Translate the following message from {source_lang} to {target_lang} and provide only the translation: {text}"
        ),
    ]
    
    result = model.invoke(messages)
    return result.content

# Example usage
# source_text = "Hello, how are you?"
# source_language = "English"
# target_language = "French"

# translated_text = translate_text(source_text, source_language, target_language)
# print("Translated Text:", translated_text)
