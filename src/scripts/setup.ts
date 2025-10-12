// scripts/setup.ts
import * as fs from "fs";
import * as path from "path";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeFileIfNotExists(filePath: string, content: string) {
  if (fs.existsSync(filePath)) {
    console.log(
      `↪︎ Already exists (not overwritten): ${path.relative(
        process.cwd(),
        filePath
      )}`
    );
    return;
  }
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`✓ Created: ${path.relative(process.cwd(), filePath)}`);
}

function readJsonIfExists<T = any>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonPretty(filePath: string, obj: any) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf-8");
  console.log(`✓ Wrote: ${path.relative(process.cwd(), filePath)}`);
}

// Only run when installed as a dependency (avoid running inside the package repo)
const isRunningInsideOwnPackage = process.env.INIT_CWD === process.cwd();
if (isRunningInsideOwnPackage) {
  console.log(
    "postinstall: skipping setup (running inside the package itself)."
  );
  process.exit(0);
}

function main() {
  const projectRoot = process.env.INIT_CWD || process.cwd();

  // 1) Fixtures/
  const fixturesDir = path.resolve(projectRoot, "Fixtures");
  ensureDir(fixturesDir);

  // 2) tests/ or e2e/ spec
  const testsDirCandidate = path.resolve(projectRoot, "tests");
  const e2eDirCandidate = path.resolve(projectRoot, "e2e");

  let targetTestsDir = "";
  if (
    fs.existsSync(testsDirCandidate) &&
    fs.lstatSync(testsDirCandidate).isDirectory()
  ) {
    targetTestsDir = testsDirCandidate;
  } else if (
    fs.existsSync(e2eDirCandidate) &&
    fs.lstatSync(e2eDirCandidate).isDirectory()
  ) {
    targetTestsDir = e2eDirCandidate;
  } else {
    targetTestsDir = testsDirCandidate;
    ensureDir(targetTestsDir);
  }

  const specPath = path.join(targetTestsDir, "json-plugin.spec.ts");
  const specContent = `import { test } from "@playwright/test";
import { generateTestsFromJson } from "playwright-plugin-web-from-json";
import path from "path";

generateTestsFromJson(
  {
    dir: path.resolve(process.cwd(), "Fixtures"),
    // baseURLOverride: "https://your-app.example"
  },
  test
);
`;
  writeFileIfNotExists(specPath, specContent);

  // 3) VS Code snippets (.vscode/snippets/json.json)
  const vscodeSnippetsDir = path.resolve(projectRoot, ".vscode");
  const jsonSnippetsPath = path.join(vscodeSnippetsDir, "plugin.code-snippets");

  // These are the snippets we want to ensure exist
  const snippetsToAdd = {
    "PW JSON: Minimal suite": {
      prefix: "json_describe",
      description: "Create a minimal JSON with one describe and one case",
      body: [
        "{",
        '  "describe": {',
        '    "text": "${1:Example JSON test}",',
        '    "${2:case-key}": {',
        '      "title": "${3:Test title}",',
        '      "url": "${4:/}",',
        '      "actions": [',
        '        { "click": "${5:a > Get started}" },',
        '        { "expectVisible": "${6:Loaded}" }',
        "      ]",
        "    }",
        "  }",
        "}",
      ],
    },
    "PW JSON: Two cases (same describe)": {
      prefix: "json_describe-two",
      description:
        "Create a JSON with one describe and two cases (second without url, stays on page)",
      body: [
        "{",
        '  "describe": {',
        '    "text": "${1:Suite name}",',
        '    "${2:first-case}": {',
        '      "title": "${3:First case}",',
        '      "url": "${4:/login}",',
        '      "actions": [',
        '        { "loc": "#email", "type": "${5:faker.internet.email()}" },',
        '        { "loc": "#password", "type": "${6:Secret123}" },',
        '        { "click": "${7:button > Sign in}" },',
        '        { "expectUrl": { "contains": "${8:/dashboard}" } }',
        "      ]",
        "    },",
        '    "${9:second-case}": {',
        '      "title": "${10:Follow-up without url}",',
        '      "actions": [',
        '        { "click": "${11:a > Settings}" },',
        '        { "expectVisible": "${12:Settings}" }',
        "      ]",
        "    }",
        "  }",
        "}",
      ],
    },
    "PW JSON: Full featured template": {
      prefix: "json-full",
      description:
        "Full template with before, frame/within/nth, waitRequest, and expectVisible (string+timeout)",
      body: [
        "{",
        '  "describe": {',
        '    "text": "${1:CRUD Suite}",',
        '    "before": "${2:./00-login.json}",',
        "",
        '    "${3:create-item}": {',
        '      "title": "${4:Create item}",',
        '      "url": "${5:/items/new}",',
        '      "actions": [',
        '        { "loc": "#title", "type": "${6:faker.person.fullName()}" },',
        '        { "select": { "label": "${7:High}" }, "loc": "${8:#priority}" },',
        '        { "upload": "${9:tests/fixtures/file.png}", "loc": "${10:input[type=file]}" },',
        '        { "click": "${11:button > Save}" },',
        '        { "waitRequest": { "urlIncludes": "${12:/api/items}", "status": ${13:200} } },',
        '        { "expectUrl": { "contains": "${14:/items/}" } }',
        "      ]",
        "    },",
        "",
        '    "${15:verify-in-iframe}": {',
        '      "title": "${16:Verify details inside iframe}",',
        '      "actions": [',
        '        { "click": "${17:a > Details}" },',
        '        { "expectVisible": "${18:h2 > Item details}", "frame": "${19:iframe#details}" },',
        '        { "expectText": { "contains": "${20:Status: Active}" }, "loc": "${21:.status}", "frame": "${22:iframe#details}", "within": "${23:.panel}", "nth": ${24:0} }',
        "      ]",
        "    },",
        "",
        '    "${25:list-rows}": {',
        '      "title": "${26:Check rows}",',
        '      "actions": [',
        '        { "expectVisible": "${27:.row}", "first": true },',
        '        { "expectVisible": "${28:.row}", "last": true },',
        '        { "expectVisible": "${29:.row}", "nth": ${30:2}, "timeout": ${31:5000} }',
        "      ]",
        "    }",
        "  }",
        "}",
      ],
    },
    "PW JSON (no describe): single case": {
      prefix: "json-nodesc-one",
      description: "JSON without describe — single case at root",
      body: [
        "{",
        '  "title": "${1:Test title}",',
        '  "url": "${2:/}",',
        '  "actions": [',
        '    { "click": "${3:a > Get started}" },',
        '    { "expectVisible": "${4:Loaded}" }',
        "  ]",
        "}",
      ],
    },
    "PW JSON (no describe): multiple cases (array)": {
      prefix: "json-nodesc-array",
      description: "JSON without describe — multiple cases as array",
      body: [
        "[",
        "  {",
        '    "title": "${1:First case}",',
        '    "url": "${2:/login}",',
        '    "actions": [',
        '      { "loc": "#email", "type": "${3:faker.internet.email()}" },',
        '      { "loc": "#password", "type": "${4:Secret123}" },',
        '      { "click": "${5:button > Sign in}" },',
        '      { "expectUrl": { "contains": "${6:/dashboard}" } }',
        "    ]",
        "  },",
        "  {",
        '    "title": "${7:Second case (no url, stays on page)}",',
        '    "actions": [',
        '      { "click": "${8:a > Settings}" },',
        '      { "expectVisible": "${9:Settings}" }',
        "    ]",
        "  }",
        "]",
      ],
    },
    "PW JSON (no describe): flat object (named cases)": {
      prefix: "json-nodesc-map",
      description: "JSON without describe — object with named cases as keys",
      body: [
        "{",
        '  "${1:login}": {',
        '    "title": "${2:Login}",',
        '    "url": "${3:/login}",',
        '    "actions": [',
        '      { "loc": "#email", "type": "${4:faker.internet.email()}" },',
        '      { "loc": "#password", "type": "${5:Secret123}" },',
        '      { "click": "${6:button > Sign in}" }',
        "    ]",
        "  },",
        '  "${7:profile}": {',
        '    "title": "${8:Open profile}",',
        '    "actions": [',
        '      { "click": "${9:a > Profile}" },',
        '      { "expectVisible": "${10:h1 > Profile}" }',
        "    ]",
        "  }",
        "}",
      ],
    },
  };

  // Merge strategy: add keys that don't exist, keep existing as-is
  const existing =
    readJsonIfExists<Record<string, any>>(jsonSnippetsPath) || {};
  let added = 0;
  for (const [key, val] of Object.entries(snippetsToAdd)) {
    if (!(key in existing)) {
      (existing as any)[key] = val;
      added++;
    }
  }
  if (added > 0) {
    writeJsonPretty(jsonSnippetsPath, existing);
  } else {
    console.log(
      `↪︎ VS Code snippets already present (no changes): ${path.relative(
        process.cwd(),
        jsonSnippetsPath
      )}`
    );
  }

  const exampleJsonPathSnippets = path.join(
    fixturesDir,
    "playwright-plugin-web-from-json.json"
  );
  const exampleJsonSnippets = {
    describe: {
      text: "playwright-plugin-web-from-json — Scenario Lab (Full Suite)",

      "open-page": {
        title: "Open Scenario Lab",
        url: "http://127.0.0.1:5500",
        actions: [
          { expectVisible: "h2 > Navigation & URL" },
          { expectText: { contains: "Scenario Lab" } },
        ],
      },

      "nav-dashboard": {
        title: "Navigation: hash → #/dashboard",
        actions: [
          { click: "#go-dashboard" },
          { expectUrl: { contains: "#/dashboard" } },
        ],
      },

      "hover-tooltip": {
        title: "Hover: shows tooltip",
        actions: [{ hover: "Hover me" }, { expectVisible: "#hover-tip" }],
      },

      "click-selector-toast": {
        title: "Click by selector: toast becomes visible",
        actions: [
          { click: "#btn-selector" },
          { expectVisible: "#selector-result" },
          {
            expectText: { contains: "Selector click OK" },
            loc: "#selector-result",
          },
        ],
      },

      "click-by-text": {
        title: "Click by exact text",
        actions: [
          { click: "Click by exact text" },
          { expectText: { equals: "Clicked by text" }, loc: "#text-result" },
        ],
      },

      "typing-fast-and-slow": {
        title: "Typing: fast + slow + summary",
        actions: [
          { loc: "#email", type: "faker.internet.email()" },
          { loc: "#name", type: "faker.person.fullName()" },
          { loc: "#pass", typeSlow: "SuperSecret123" },
          { click: "#btn-show-typed" },
          { expectVisible: "#typed-output" },
          { expectText: { contains: "email=" }, loc: "#typed-output" },
        ],
      },

      "press-enter": {
        title: "Press: Enter on field",
        actions: [
          { loc: "#press-input", type: "Hello world" },
          { press: "Enter", loc: "#press-input" },
          { expectText: { equals: "Enter pressed!" }, loc: "#press-output" },
        ],
      },

      "forms-check-radio-select": {
        title: "Forms: check/radio/select + read values",
        actions: [
          { check: "#ck-terms" },
          { check: "input[name='plan'][value='pro']" },
          { select: { label: "Brazil" }, loc: "#country" },
          { click: "#check-read" },
          { expectText: { contains: "terms=true" }, loc: "#check-output" },
          { expectText: { contains: "plan=pro" }, loc: "#check-output" },
        ],
      },

      "flash-text-and-close": {
        title: "Flash: visible and text",
        actions: [
          { expectVisible: "#flash" },
          {
            expectText: { contains: "Your username is invalid!" },
            loc: "#flash",
          },
          { click: "#close-flash" },
        ],
      },

      "multiple-matches-nth": {
        title: "Multiple matches: nth inside scope",
        actions: [
          { click: ".item", within: "#repeat-scope", nth: 1 },
          {
            expectText: { equals: "Clicked: Row #2" },
            loc: "#repeat-output",
          },
        ],
      },

      "multiple-matches-first-last": {
        title: "Multiple matches: first + last",
        actions: [
          { click: ".item", within: "#repeat-scope", first: true },
          {
            expectText: { equals: "Clicked: Row #1" },
            loc: "#repeat-output",
          },
          { click: ".item", within: "#repeat-scope", last: true },
          {
            expectText: { equals: "Clicked: Row #3" },
            loc: "#repeat-output",
          },
        ],
      },

      "within-scope": {
        title: "Within: scoped click",
        actions: [
          { click: "Scoped Button B", within: "#within-scope" },
          {
            expectText: { equals: "Within clicked: Scoped Button B" },
            loc: "#within-output",
          },
        ],
      },

      "iframe-basic": {
        title: "Iframe: click inside + visible toast",
        actions: [
          { click: "#frame-btn", frame: "#demo-frame" },
          { expectVisible: "#frame-toast", frame: "#demo-frame" },
        ],
      },

      "network-waitRequest-posts": {
        title: "Network: waitRequest /posts 200",
        actions: [
          { click: "#btn-fetch-posts" },
          {
            waitRequest: {
              urlIncludes: "/posts",
              status: 200,
              timeout: 50000,
            },
          },
          { expectText: { contains: "status 200" }, loc: "#net-output" },
        ],
      },

      "network-waitRequest-user": {
        title: "Network: waitRequest /users/1 200",
        actions: [
          { click: "#btn-fetch-user" },
          { waitRequest: { urlIncludes: "/users/1", status: 200 } },
          { expectText: { contains: "status 200" }, loc: "#net-output" },
        ],
      },

      "modal-open-and-screenshot": {
        title: "Modal: open (visible) + screenshot target",
        actions: [
          { click: "#open-modal" },
          { expectVisible: "#backdrop" },
          {
            screenshot: { path: "screens/card.png" },
            loc: "#card-screenshot",
          },
        ],
      },
    },
  };
  writeFileIfNotExists(
    exampleJsonPathSnippets,
    JSON.stringify(exampleJsonSnippets, null, 2) + "\n"
  );

  // secund json
  const exampleJsonPathSecond = path.join(
    fixturesDir,
    "plugin-example-voe-latam.json"
  );
  const exampleJsonSecond = {
    describe: {
      text: "Test in Voe Latam",
      "case-key": {
        title: "Buy ticket",
        url: "https://www.latamairlines.com/br/pt",
        actions: [
          { click: "Aceite todos os cookies" },
          {
            root: "#login-incentive-popper",
            parent: "Faça login na LATAM para obter diversos benefícios.",
            click: "#button-close-login-incentive i",
          },
          {
            loc: "[placeholder='Insira uma origem']",
            type: "Recife, REC - Brasil",
            click: "{type}",
          },
          {
            loc: "#fsb-destination--text-field",
            type: "São Paulo, GRU - Brasil",
            click: "{type}",
          },
          { click: "#fsb-departure" },
          { expectVisible: "#fsb-calendar-container-desktop" },
          {
            click: "#date-2025-10-20",
          },
          {
            click: "#date-2025-10-27",
          },
          { click: "#fsb-passengers--text-field" },
          {
            root: ".PassengersSelectionstyles__Container-sc-6im5y0-0",
            click: "#fsb-adults-selector-container #fsb-adults-selector-add",
          },
          {
            root: ".PassengersSelectionstyles__Container-sc-6im5y0-0",
            click:
              "#fsb-children-selector-container #fsb-children-selector-add",
          },
          { click: "Procurar voos" },

          { wait: 3000 },
        ],
      },
    },
  };
  writeFileIfNotExists(
    exampleJsonPathSecond,
    JSON.stringify(exampleJsonSecond, null, 2) + "\n"
  );

  //
  // secund json
  const example3 = path.join(fixturesDir, "plugin-example-auto.json");
  const exampleJson3 = {
    describe: {
      text: "Test in App",
      "case-key": {
        title: "All Tests",
        url: "https://jamesonbatista.github.io/projectqatesterweb/",
        actions: [
          { click: "Login" },
          { loc: "#username", type: "faker.internet.email()" },
          { loc: "#password", type: "faker.internet.username()" },
          { click: "[type='submit'] > Login" },
          { wait: 3000 },
        ],
      },
      "New register in app": {
        title: "New Register in platform",
        actions: [
          { loc: "#name", type: "faker.internet.username()" },
          { loc: "#email", type: "faker.internet.email()" },
          { loc: "#password", type: "faker.internet.username()" },
          { select: { value: ["Feminino"] }, loc: "#gender" },
          {
            parent: "Data de Nascimento:",
            loc: "input",
            type: "10/07/1988",
          },
          {
            parent: "Telefone:",
            loc: "input",
            type: "91899999999",
          },
          {
            parent: "Endereço:",
            loc: "input",
            type: "Street Call in form new",
          },
          { select: { value: "São Paulo" }, loc: "#state" },
          {
            parent: "Aceito os termos e condições",
            click: "#terms",
          },
          { click: "Cadastrar" },
          { wait: 3000 },
          { loc: "#customAlert", click: "OK" },
        ],
      },
      "Access Iframe": {
        title: "Access Iframe ",
        actions: [
          { click: "Menu" },
          { click: "nav ul li > Iframe Test" },
          {
            frame: ["[src='iframe1.html']", "[src='iframe2.html']"],
            expectVisible: "Conteúdo do Iframe 2",
          },
          { wait: 3000 },
        ],
      },
      "Register in Iframe": {
        run: "userEmail",
        title: "New Register in platform with Iframe",
        actions: [
          { click: "Menu" },
          { click: "nav ul li > Cadastro Iframe" },
          {
            frame: ".cadastro-iframe",
            root: "#cadastroForm",
            loc: "#name",
            typeSlow: "{resultFunc}",
          },
          {
            frame: ".cadastro-iframe",
            root: "#cadastroForm",
            loc: "#email",
            type: "faker.internet.email()",
          },
          { run: "hello" },
          {
            frame: ".cadastro-iframe",
            root: "#cadastroForm",
            loc: "#address",
            typeSlow: "{resultFunc.greeting}",
          },
        ],
      },
      "create Task": {
        title: "Create a new task",
        actions: [
          { click: "Menu" },
          { click: "nav ul li > Tasks" },
          { loc: "#taskTitle", type: "faker.internet.username()" },
          { run: "randomUser" },
          { loc: "#taskDescription", type: "{resultFunc.username}" },
          { wait: 3000 },
        ],
      },
    },
  };
  writeFileIfNotExists(example3, JSON.stringify(exampleJson3, null, 2) + "\n");

  console.log("🎯 Setup completed.");
}

// html
const projectRoot = process.env.INIT_CWD || process.cwd();
const vscodeSnippetsDir = path.resolve(projectRoot, "html");
const jsonSnippetsPath = path.join(vscodeSnippetsDir, "index.html");
const specContent = `<!doctype html>
<html lang="en">

<head>
	<meta charset="utf-8" />
	<title>playwright-plugin-web-from-json — Scenario Lab</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
	<style>
		:root {
			--bg: #0b1020;
			--card: rgba(255, 255, 255, 0.06);
			--stroke: rgba(255, 255, 255, 0.18);
			--txt: #e8eefc;
			--muted: #a9b2c7;
			--accent: #8ee6ff;
			--ok: #5ce19e;
			--warn: #ffc46b;
			--err: #ff6b6b;
			--shadow: 0 10px 30px rgba(0, 0, 0, .35);
		}

		* {
			box-sizing: border-box;
		}

		html,
		body {
			height: 100%;
			background: radial-gradient(1200px 900px at 10% -10%, #1b2b5a 0%, transparent 60%),
				radial-gradient(1000px 900px at 90% -10%, #273d84 0%, transparent 60%),
				radial-gradient(1200px 900px at 50% 110%, #12234d 0%, transparent 60%),
				var(--bg);
			color: var(--txt);
			font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif;
			margin: 0;
			line-height: 1.45;
		}

		header {
			max-width: 1200px;
			margin: 40px auto 10px;
			padding: 0 24px;
		}

		.brand {
			display: flex;
			align-items: center;
			gap: 14px;
			margin-bottom: 10px;
		}

		.logo {
			width: 42px;
			height: 42px;
			border-radius: 10px;
			background: linear-gradient(135deg, #5dd6ff, #7cfcc5);
			box-shadow: var(--shadow);
		}

		h1 {
			font-size: 30px;
			margin: 0;
			letter-spacing: .4px;
		}

		.subtitle {
			color: var(--muted);
			margin-top: 6px;
		}

		.urlbar {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			padding: 8px 12px;
			border-radius: 12px;
			border: 1px solid var(--stroke);
			background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
			backdrop-filter: blur(8px);
			font-size: 13px;
			color: var(--muted);
			box-shadow: var(--shadow);
		}

		.urlbar code {
			color: var(--accent);
			font-weight: 600;
		}

		main {
			max-width: 1200px;
			margin: 16px auto 60px;
			padding: 0 24px;
		}

		.grid {
			display: grid;
			gap: 18px;
			grid-template-columns: repeat(12, 1fr);
		}

		.card {
			grid-column: span 6;
			border: 1px solid var(--stroke);
			border-radius: 18px;
			background: radial-gradient(600px 300px at 20% -10%, rgba(255, 255, 255, .10), transparent 40%),
				linear-gradient(180deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.04));
			backdrop-filter: blur(10px);
			padding: 18px;
			box-shadow: var(--shadow);
			position: relative;
		}

		.card.full {
			grid-column: 1 / -1;
		}

		.card h2 {
			margin: 0 0 12px;
			font-size: 18px;
			letter-spacing: .25px;
		}

		.hint {
			color: var(--muted);
			font-size: 13px;
			margin-bottom: 12px;
		}

		.row {
			display: flex;
			flex-wrap: wrap;
			gap: 10px;
			align-items: center;
		}

		.btn {
			padding: 10px 14px;
			border-radius: 10px;
			border: 1px solid var(--stroke);
			background: rgba(255, 255, 255, 0.08);
			color: var(--txt);
			font-weight: 600;
			cursor: pointer;
			text-decoration: none;
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}

		.btn:hover {
			background: rgba(255, 255, 255, 0.12);
		}

		.ok {
			color: var(--ok);
		}

		.warn {
			color: var(--warn);
		}

		.err {
			color: var(--err);
		}

		input[type="text"],
		input[type="email"],
		input[type="password"],
		select {
			border: 1px solid var(--stroke);
			background: rgba(255, 255, 255, 0.08);
			color: var(--txt);
			padding: 10px 12px;
			border-radius: 10px;
			min-width: 200px;
		}

		input[type="file"] {
			color: var(--muted);
		}

		label {
			font-size: 13px;
			color: var(--muted);
		}

		.toast,
		.pill {
			display: none;
			padding: 10px 12px;
			border-radius: 10px;
			border: 1px solid var(--stroke);
			background: rgba(255, 255, 255, 0.08);
		}

		.toast.show,
		.pill.show {
			display: inline-flex;
		}

		.pill {
			color: var(--muted);
		}

		.divider {
			height: 1px;
			background: var(--stroke);
			margin: 12px 0;
			opacity: .6;
		}

		/* tooltip on hover demo */
		.hover-wrap {
			position: relative;
			display: inline-block;
		}

		.tooltip {
			position: absolute;
			inset: auto auto 120% 0;
			transform: translateY(6px);
			padding: 8px 10px;
			border-radius: 8px;
			border: 1px solid var(--stroke);
			background: rgba(255, 255, 255, 0.12);
			color: var(--txt);
			font-size: 12px;
			display: none;
		}

		.hover-wrap:hover .tooltip {
			display: block;
		}

		/* iframe */
		.frame-container {
			border-radius: 14px;
			overflow: hidden;
			border: 1px solid var(--stroke);
		}

		iframe {
			width: 100%;
			height: 220px;
			border: 0;
			background: rgba(255, 255, 255, 0.04);
		}

		/* repeated selectors for nth/first/last */
		.list {
			display: grid;
			gap: 6px;
		}

		.item {
			padding: 10px 12px;
			border: 1px dashed var(--stroke);
			border-radius: 10px;
		}

		/* flash error demo */
		.flash {
			padding: 12px 14px;
			border: 1px solid var(--err);
			border-radius: 10px;
			color: var(--err);
			background: rgba(255, 0, 0, 0.08);
		}

		.flash.hidden {
			display: none;
		}

		.close {
			color: var(--err);
			text-decoration: none;
			font-weight: 800;
			margin-left: 6px;
		}

		/* modal */
		.backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, .45);
			display: none;
			align-items: center;
			justify-content: center;
		}

		.backdrop.show {
			display: flex;
		}

		.modal {
			width: 440px;
			border-radius: 16px;
			border: 1px solid var(--stroke);
			background: rgba(10, 12, 20, .95);
			padding: 18px;
			box-shadow: var(--shadow);
		}

		@media (max-width: 900px) {
			.card {
				grid-column: 1 / -1;
			}
		}
	</style>
</head>

<body>
	<header>
		<div class="brand">
			<div class="logo"></div>
			<div>
				<h1>playwright-plugin-web-from-json</h1>
				<div class="subtitle">Scenario Lab — a purpose-built page to exercise every action & assertion the
					plugin supports.</div>
			</div>
		</div>
		<div class="urlbar">Current URL: <code id="current-url"></code></div>
	</header>

	<main>
		<section class="grid">

			<!-- NAV & URL (hash-based navigation) -->
			<div class="card">
				<h2>Navigation & URL</h2>
				<p class="hint">Tests applied: <strong>click</strong> (by selector), <strong>expectUrl</strong>
					(contains), hash routing without server.</p>
				<div class="row">
					<a id="go-dashboard" class="btn" href="#/dashboard" role="button">Go → #/dashboard</a>
					<span class="pill" id="nav-pill">Ready</span>
				</div>
				<div class="divider"></div>
				<div class="row">
					<div class="hover-wrap">
						<span class="btn">Hover me</span>
						<div class="tooltip" id="hover-tip">Tooltip shown on hover</div>
					</div>
					<span class="hint">Tests: <strong>hover</strong> + <strong>expectVisible</strong> on tooltip.</span>
				</div>
			</div>

			<!-- CLICK by text / selector, VISIBLE, TEXT -->
			<div class="card">
				<h2>Clicks & Visibility</h2>
				<p class="hint">Tests applied: <strong>click</strong> by exact text and by selector;
					<strong>expectVisible</strong>, <strong>expectText</strong>.</p>
				<div class="row">
					<button class="btn" id="btn-selector">Make toast visible</button>
					<div class="toast" id="selector-result">Toast placeholder</div>
				</div>
				<div class="row" style="margin-top: 8px">
					<button class="btn" id="btn-text">Click by exact text</button>
					<span id="text-result" class="pill">No click yet</span>
				</div>
			</div>

			<!-- TYPE / TYPE SLOW / PRESS -->
			<div class="card">
				<h2>Typing & Keys</h2>
				<p class="hint">Tests applied: <strong>type</strong>, <strong>typeSlow</strong>, <strong>press</strong>
					(Enter), dynamic <strong>faker</strong> & <strong>date(...)</strong>.</p>
				<div class="row">
					<input type="email" id="email" placeholder="email" />
					<input type="text" id="name" placeholder="full name" />
					<input type="password" id="pass" placeholder="password" />
					<button class="btn" id="btn-show-typed">Show typed</button>
					<span id="typed-output" class="pill">—</span>
				</div>
				<div class="row" style="margin-top: 8px">
					<input type="text" id="press-input" placeholder="press Enter here" />
					<span id="press-output" class="pill">Waiting…</span>
				</div>
			</div>

			<!-- CHECK / RADIO / SELECT / UPLOAD -->
			<div class="card">
				<h2>Forms: Check, Radio, Select, Upload</h2>
				<p class="hint">Tests applied: <strong>check/uncheck</strong>, <strong>select</strong> (by
					label/value/index), <strong>upload</strong>.</p>
				<div class="row">
					<label><input type="checkbox" id="ck-terms" /> Accept terms</label>
					<label><input type="radio" name="plan" value="free" /> Free</label>
					<label><input type="radio" name="plan" value="pro" /> Pro</label>
				</div>
				<div class="row" style="margin-top: 8px">
					<label for="country">Country</label>
					<select id="country">
						<option value="">—</option>
						<option value="BR">Brazil</option>
						<option value="US">United States</option>
						<option value="DE">Germany</option>
					</select>
					<input type="file" id="file" />
				</div>
				<div class="row" style="margin-top: 8px">
					<button class="btn" id="check-read">Read values</button>
					<span id="check-output" class="pill">terms=?, plan=?, file=?</span>
				</div>
			</div>

			<!-- EXPECT TEXT (with/without loc), FLASH -->
			<div class="card">
				<h2>Text Assertions & Flash</h2>
				<p class="hint">Tests applied: <strong>expectText</strong> com/sem <code>loc</code>,
					<strong>expectVisible</strong> simples.</p>
				<div class="flash" id="flash">
					Your username is invalid!
					<a href="#" class="close" id="close-flash">×</a>
				</div>
			</div>

			<!-- NTH / FIRST / LAST -->
			<div class="card">
				<h2>Multiple Matches: nth / first / last</h2>
				<p class="hint">Tests applied: clique em elementos repetidos usando <strong>nth</strong>,
					<strong>first</strong>, <strong>last</strong> no contexto.</p>
				<div id="repeat-scope" class="list">
					<button class="btn item">Row #1</button>
					<button class="btn item">Row #2</button>
					<button class="btn item">Row #3</button>
				</div>
				<div class="row" style="margin-top: 8px">
					<span class="pill" id="repeat-output">No row clicked</span>
				</div>
			</div>

			<!-- WITHIN / FRAME -->
			<div class="card">
				<h2>Within & Iframe</h2>
				<p class="hint">Tests applied: <strong>within</strong> (escopo de busca) e <strong>frame</strong>
					(cadeia de iframes).</p>
				<div class="divider"></div>
				<div class="row">
					<div id="within-scope" class="list" style="min-width: 260px;">
						<button class="btn item">Scoped Button A</button>
						<button class="btn item">Scoped Button B</button>
					</div>
					<span class="pill" id="within-output">No scoped click</span>
				</div>
				<div class="divider"></div>
				<div class="frame-container">
					<iframe id="demo-frame" srcdoc='
            <!doctype html><html><head>
              <meta charset="utf-8"/>
              <style>
                html,body { margin:0; font:14px/1.4 system-ui; background:#0f1428; color:#e8eefc; }
                .box { padding: 14px; }
                .btn { padding:8px 12px; border:1px solid rgba(255,255,255,.25); background:rgba(255,255,255,.08); border-radius:8px; color:#e8eefc; }
                .toast { display:none; margin-left:10px; }
                .toast.show { display:inline-block; }
              </style>
            </head>
            <body>
              <div class="box">
                <button class="btn" id="frame-btn">Click inside iframe</button>
                <span id="frame-toast" class="toast">Hello from iframe</span>
                <script>
                  document.getElementById("frame-btn").addEventListener("click", function(){
                    var t = document.getElementById("frame-toast");
                    t.classList.add("show");
                  });
                </script>
              </div>
            </body></html>
          '></iframe>
				</div>
			</div>

			<!-- WAIT REQUEST -->
			<div class="card full">
				<h2>Network: waitRequest</h2>
				<p class="hint">Tests applied: <strong>waitRequest</strong> (aguarda resposta com <code>status</code> e
					<code>urlIncludes</code>). Usa JSONPlaceholder (GET 200) para ser estável em servidor estático. </p>
				<div class="row">
					<button class="btn" id="btn-fetch-posts">Fetch posts (GET /posts)</button>
					<button class="btn" id="btn-fetch-user">Fetch user (GET /users/1)</button>
					<span id="net-output" class="pill">Idle</span>
				</div>
			</div>

			<!-- MODAL / SCREENSHOT TARGET -->
			<div class="card">
				<h2>Modal & Screenshot Targets</h2>
				<p class="hint">Tests applied: abrir/fechar modal (para <strong>expectVisible</strong>) e um alvo “card”
					para <strong>screenshot</strong>.</p>
				<div class="row">
					<button class="btn" id="open-modal">Open modal</button>
					<div id="card-screenshot" class="pill show" style="padding:18px;">Screenshot this card</div>
				</div>
			</div>

		</section>
	</main>

	<!-- Modal -->
	<div class="backdrop" id="backdrop" aria-hidden="true">
		<div class="modal">
			<div class="row" style="justify-content: space-between;">
				<strong>Modal title</strong>
				<button class="btn" id="close-modal">×</button>
			</div>
			<div class="divider"></div>
			<p>This is a modal body content for visibility checks.</p>
		</div>
	</div>

	<script>
		(function () {
			// URL badge
			var urlBadge = document.getElementById("current-url");
			function refreshURL() { if (urlBadge) urlBadge.textContent = location.href; }
			refreshURL();
			window.addEventListener("hashchange", refreshURL);
			window.addEventListener("popstate", refreshURL);

			// Click -> toast visible
			document.getElementById("btn-selector").addEventListener("click", function () {
				var t = document.getElementById("selector-result");
				t.textContent = "Selector click OK";
				t.classList.add("show");
				// inline hardening
				t.style.display = "inline-flex";
				t.style.visibility = "visible";
				t.style.opacity = "1";
			});

			// Click by exact text
			document.getElementById("btn-text").addEventListener("click", function () {
				var pill = document.getElementById("text-result");
				pill.textContent = "Clicked by text";
				pill.classList.add("show");
			});

			// Show typed summary
			document.getElementById("btn-show-typed").addEventListener("click", function () {
				var email = (document.getElementById("email").value || "").trim();
				var name = (document.getElementById("name").value || "").trim();
				var pass = (document.getElementById("pass").value || "").trim();
				var out = document.getElementById("typed-output");
				out.textContent = "email=" + (email || "∅") + ", name=" + (name || "∅") + ", pass=" + (pass ? "•••" : "∅");
				out.classList.add("show");
			});

			// Press Enter
			document.getElementById("press-input").addEventListener("keydown", function (e) {
				if (e.key === "Enter") {
					var out = document.getElementById("press-output");
					out.textContent = "Enter pressed!";
					out.classList.add("show");
				}
			});

			// Read check/radio/upload
			document.getElementById("check-read").addEventListener("click", function () {
				var terms = !!document.getElementById("ck-terms").checked;
				var checked = document.querySelector("input[name='plan']:checked");
				var plan = checked ? checked.value : "none";
				var file = document.getElementById("file").files[0];
				var fileName = file ? file.name : "none";
				var out = document.getElementById("check-output");
				out.textContent = "terms=" + terms + ", plan=" + plan + ", file=" + fileName;
				out.classList.add("show");
			});

			// Close flash
			document.getElementById("close-flash").addEventListener("click", function (e) {
				e.preventDefault();
				document.getElementById("flash").classList.add("hidden");
			});

			// Repeated selectors demo
			document.getElementById("repeat-scope").addEventListener("click", function (e) {
				var btn = e.target.closest(".item");
				if (!btn) return;
				document.getElementById("repeat-output").textContent = "Clicked: " + btn.textContent.trim();
				document.getElementById("repeat-output").classList.add("show");
			});

			// Within scope click
			document.getElementById("within-scope").addEventListener("click", function (e) {
				var btn = e.target.closest(".item");
				if (!btn) return;
				document.getElementById("within-output").textContent = "Within clicked: " + btn.textContent.trim();
				document.getElementById("within-output").classList.add("show");
			});

			// Network buttons (JSONPlaceholder)
			function fetchJSON(u, label) {
				var out = document.getElementById("net-output");
				out.textContent = "Fetching " + label + "...";
				out.classList.add("show");
				// Fire-and-forget; o runner observará a response:
				fetch(u, { mode: 'cors' })
					.then(function (r) {
						out.textContent = label + " → status " + r.status;
						return r.json().catch(function () { });
					})
					.catch(function (err) {
						out.textContent = label + " → error";
					});
			}
			document.getElementById("btn-fetch-posts").addEventListener("click", function () {
				fetchJSON("https://jsonplaceholder.typicode.com/posts", "GET /posts");
			});
			document.getElementById("btn-fetch-user").addEventListener("click", function () {
				fetchJSON("https://jsonplaceholder.typicode.com/users/1", "GET /users/1");
			});

			// Modal
			document.getElementById("open-modal").addEventListener("click", function () {
				document.getElementById("backdrop").classList.add("show");
			});
			document.getElementById("close-modal").addEventListener("click", function () {
				document.getElementById("backdrop").classList.remove("show");
			});
		})();
	</script>
</body>

</html>
`;
writeFileIfNotExists(jsonSnippetsPath, specContent);

// html
const runFunc = path.resolve(projectRoot, "help");
const nameRunfunc = path.join(runFunc, "plugin-func.ts");
const cont = `
export class RunPluginFunctions { // not modify name
  // sync OK
  hello() {
    return { greeting: "hello", email: "qa@example.com" };
  }

  // async OK
  async randomUser() {
    return { username: "user_" + Math.random().toString(36).slice(2, 7) };
  }

  async delayedCode() {
    await new Promise((r) => setTimeout(r, 1000));
    return "CODE-" + Math.floor(Math.random() * 999);
  }

  randomCode() {
    return Math.floor(Math.random() * 10000); // number
  }

  userEmail() {
    return "user_" + Date.now() + "@example.com"; // string
  }
}

`;
writeFileIfNotExists(nameRunfunc, cont);
main();
