import logging
from transformers import (
    MBartForConditionalGeneration,
    MBart50TokenizerFast,
    MBart50Tokenizer,
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MBartTranslator:
    def __init__(self, model_name="facebook/mbart-large-50-many-to-many-mmt"):
        self.model_name = model_name
        self.model, self.tokenizer = self.load_model_and_tokenizer()

    def load_model_and_tokenizer(self):
        """
        Loads the mBART model and tokenizer.
        """
        try:
            # Load model and tokenizer
            tokenizer = MBart50Tokenizer.from_pretrained(self.model_name)
            model = MBartForConditionalGeneration.from_pretrained(self.model_name)
            logger.info("Successfully loaded mBART model and tokenizer.")
            return model, tokenizer
        except Exception as e:
            logger.error(f"Failed to load mBART model and tokenizer: {e}")
            raise

    def translate(self, text, source_lang, target_lang, max_length=40, num_beams=4):
        """
        Translates text from source_lang to target_lang using mBART.

        Parameters:
            - text (str): The input text to translate.
            - source_lang (str): Source language code (e.g., "en_XX" for English).
            - target_lang (str): Target language code (e.g., "fr_XX" for French).
            - max_length (int): Maximum length of the generated text.
            - num_beams (int): Number of beams for beam search. More beams can improve quality but increase computation.

        Returns:
            - translated_text (str): The translated text.
        """
        # Set the source language for the tokenizer
        self.tokenizer.src_lang = source_lang

        # Tokenize the input text
        encoded_input = self.tokenizer(text, return_tensors="pt")

        # Set the target language ID
        forced_bos_token_id = self.tokenizer.lang_code_to_id[target_lang]

        # Generate the translation
        try:
            output = self.model.generate(
                **encoded_input,
                forced_bos_token_id=forced_bos_token_id,
                max_length=max_length,
                num_beams=num_beams,
                early_stopping=True,
            )
            # Decode the output
            translated_text = self.tokenizer.decode(output[0], skip_special_tokens=True)
            logger.info(f"Translated text: {translated_text}")
            return translated_text
        except Exception as e:
            logger.error(f"Failed to generate translation: {e}")
            return None

    def get_supported_languages(self):
        """
        Returns a list of supported languages for mBART with their codes.
        """
        return list(self.tokenizer.lang_code_to_id.keys())


# Example usage:
# translator = MBartTranslator()
# translated_text = translator.translate("Hello, how are you?", "en_XX", "fr_XX")
# print(f"Translated Text: {translated_text}")

# languages = translator.get_supported_languages()
# print("Supported languages:", languages)
