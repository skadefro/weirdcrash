import {
    OllamaTextGenerationModel, OllamaApiConfiguration,
    StructureDefinition,
    StructureFromTextGenerationModel,
    parseJsonWithZod,
    useTool,
  } from "modelfusion";
  import { z } from "zod";
  import { runpython } from "./python-tool";
  
  // schema for prompt
  const FunctionSchema = z.object({
    function: z.string(),
    params: z.any(),
  });
  
  const ollamaapi = new OllamaApiConfiguration({
      baseUrl: "http://10.0.0.100:11434",
   });
  
  class CalculatorFunctionPromptFormat<STRUCTURE> {
    createPrompt(
      instruction: string,
      structure: StructureDefinition<any, STRUCTURE>
    ): string {
      // map parameters JSON schema
      const properties: Record<string, { type: string; description: string }> = (
        structure.schema.getJsonSchema() as any
      ).properties;
      const result = [
        `As an AI assistant, please select the most suitable function and parameters ` +
          `from the list of available functions below, based on the user's input. ` +
          `Provide your response in JSON format. Please make sure the json is valid and does not have ekstra {}`,
        ``,
        `Available functions:`,
        `${structure.name}:`,
        `  description: ${structure.description ?? ""}`,
        `  params:`,
        // Note: Does support nested schemas yet
        ...Object.entries(properties).map(
          ([name, { type, description }]) =>
            `    ${name}: (${type}) ${description}`
        ),
        ``,
        `Input: ${instruction}`,
        ``,
      ].join("\n");
      return result
    }
  
    extractStructure(response: string): unknown {
      const json = parseJsonWithZod(
        response,
        FunctionSchema
      );
      return json.params;
    }
  }
  async function promptAndRun(prompt:string) {
    console.log("******************** ")
    console.log(prompt)
    console.log("******************** ")
    let tool = "", parameters: any = "", result: string | any[] = "", currentprompt = prompt;
    do {
      try {
        const response = await useTool(
          new StructureFromTextGenerationModel({
            model: new OllamaTextGenerationModel({
              model: "llama2", api: ollamaapi
            }),
            format: new CalculatorFunctionPromptFormat(),
          }),
          runpython,
          currentprompt
        );
        tool = response.tool;
        parameters = response.parameters;
        result = response.result;
        break;
      } catch (error) {
        var e = error;
        const errormessage = (error.message ? error.message : error);
        currentprompt = prompt + "\n Please try again, i just got the following error: \n " + errormessage + "\n\nusing:" + e.input.s;
        console.error(errormessage);
      }
    } while (true);
  
    console.log(`Tool: ${tool}`);
    console.log(`Parameters: ${JSON.stringify(parameters)}`);
    console.log(`Result: ${result}`);
    console.log("******************** ")
  }
  
  async function main() {
    // await promptAndRun("Create one python script that prints the numbers 1 to 10");
    // await promptAndRun("What's fourteen times twelve?");
    await promptAndRun("Count the number of files in ~/Pictures");
    
  }
  
  main().catch(console.error);