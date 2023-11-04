import { Tool, ZodSchema } from "modelfusion";
import { z } from "zod";
// import { PythonShell } from 'python-shell';

export const runpython = new Tool({
    name: "runscript",
    description: "Execute python script",

    inputSchema: new ZodSchema(
        z.object({
            lang: z.enum(["bash", "python"]).describe("is this a Python script or bash script"),
            s: z.string().describe("Bash or python script to execute.")
        })
    ),
    execute: async ({ lang, s }) => {
        if(lang == "bash") {
            // spawn child process to run bash commands and grab the output
            const { spawn } = require('child_process');
            const child = spawn(s, {
                shell: true
            });
            let output = '';
            for await (const chunk of child.stdout) {
                output += chunk;
            }
            return output;
            
        } else {
            throw new Error("Unknown error")
            // var result = await PythonShell.runString(s, null);
            // return result
        }
    },
});
