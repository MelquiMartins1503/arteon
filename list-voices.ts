import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import dotenv from "dotenv";

dotenv.config();

async function listVoices() {
  const client = new TextToSpeechClient();

  const [result] = await client.listVoices({ languageCode: "pt-BR" });
  const voices = result.voices;

  console.log("Vozes encontradas:", voices?.length);
  voices?.forEach((voice) => {
    console.log(`Name: ${voice.name}`);
    console.log(`SSML Gender: ${voice.ssmlGender}`);
    console.log(`Natural Sample Rate Hertz: ${voice.naturalSampleRateHertz}`);
    console.log("---");
  });
}

listVoices().catch(console.error);
