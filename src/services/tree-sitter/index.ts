import * as fs from "fs/promises"
import * as path from "path"
import { loadRequiredLanguageParsers, LanguageParser } from "./languageParser"

const supportedExtensions = [
	"js",
	"jsx",
	"ts",
	"tsx",
	"py",
	"rs",
	"go",
	"c",
	"h",
	"cpp",
	"hpp",
	"cs",
	"rb",
	"java",
	"php",
	"css",
	"html",
	"json",
].map((e) => `.${e}`)

export { supportedExtensions }

/**
 * Detect frameworks and patterns in a file using Tree-sitter AST parsing
 *
 * @param filePath - Path to the file to analyze
 * @returns Array of detected frameworks/patterns
 */
export async function detectFrameworksInFile(filePath: string): Promise<string[]> {
	const frameworks: string[] = []

	try {
		const ext = path.extname(filePath).toLowerCase()

		// Check if file extension is supported
		if (!supportedExtensions.includes(ext)) {
			return frameworks
		}

		// Read file content
		const fileContent = await fs.readFile(filePath, "utf8")

		// Load parser for this file
		const languageParsers = await loadRequiredLanguageParsers([filePath])
		const extLang = ext.slice(1) // Remove leading dot

		const { parser, query } = languageParsers[extLang] || {}
		if (!parser || !query) {
			return frameworks
		}

		// Parse the file
		const tree = parser.parse(fileContent)
		if (!tree) {
			return frameworks
		}

		// Get captures from the AST
		const captures = query.captures(tree.rootNode)

		// Analyze imports and patterns
		const lines = fileContent.split("\n")

		for (const line of lines) {
			const trimmedLine = line.trim()

			// React detection
			if (
				trimmedLine.includes("import React") ||
				trimmedLine.includes("from 'react'") ||
				trimmedLine.includes('from "react"') ||
				trimmedLine.includes("useState") ||
				trimmedLine.includes("useEffect")
			) {
				if (!frameworks.includes("React")) frameworks.push("React")
			}

			// Vue detection
			if (
				trimmedLine.includes("from 'vue'") ||
				trimmedLine.includes('from "vue"') ||
				trimmedLine.includes("@Component") ||
				trimmedLine.includes("Vue.component")
			) {
				if (!frameworks.includes("Vue")) frameworks.push("Vue")
			}

			// Angular detection
			if (
				trimmedLine.includes("@angular") ||
				trimmedLine.includes("@Component") ||
				trimmedLine.includes("@Injectable")
			) {
				if (!frameworks.includes("Angular")) frameworks.push("Angular")
			}

			// Express.js detection
			if (
				trimmedLine.includes("express()") ||
				trimmedLine.includes("from 'express'") ||
				trimmedLine.includes('from "express"')
			) {
				if (!frameworks.includes("Express")) frameworks.push("Express")
			}

			// Next.js detection
			if (
				trimmedLine.includes("from 'next") ||
				trimmedLine.includes('from "next') ||
				trimmedLine.includes("getServerSideProps") ||
				trimmedLine.includes("getStaticProps")
			) {
				if (!frameworks.includes("Next.js")) frameworks.push("Next.js")
			}

			// Django detection
			if (
				trimmedLine.includes("from django") ||
				trimmedLine.includes("import django") ||
				trimmedLine.includes("django.db.models")
			) {
				if (!frameworks.includes("Django")) frameworks.push("Django")
			}

			// Flask detection
			if (
				trimmedLine.includes("from flask import") ||
				trimmedLine.includes("Flask(__name__)")
			) {
				if (!frameworks.includes("Flask")) frameworks.push("Flask")
			}

			// FastAPI detection
			if (
				trimmedLine.includes("from fastapi import") ||
				trimmedLine.includes("FastAPI()")
			) {
				if (!frameworks.includes("FastAPI")) frameworks.push("FastAPI")
			}

			// Spring Boot detection
			if (
				trimmedLine.includes("@SpringBootApplication") ||
				trimmedLine.includes("@RestController") ||
				trimmedLine.includes("import org.springframework")
			) {
				if (!frameworks.includes("Spring Boot")) frameworks.push("Spring Boot")
			}
		}

		// Use captures to detect patterns
		for (const capture of captures) {
			const { node, name } = capture

			// Detect component patterns
			if (name.includes("class") || name.includes("component")) {
				const nodeText = node.text

				// React component pattern
				if (
					nodeText.includes("Component") ||
					nodeText.includes("extends React") ||
					nodeText.includes("return (") ||
					nodeText.includes("jsx")
				) {
					if (!frameworks.includes("React")) frameworks.push("React")
				}
			}
		}

		return frameworks
	} catch (error) {
		console.warn(`⚠️ Failed to detect frameworks in ${filePath}:`, error)
		return frameworks
	}
}

/**
 * Detect frameworks across multiple files in a directory
 *
 * @param dirPath - Directory path
 * @param maxFiles - Maximum number of files to analyze (default 20)
 * @returns Array of detected frameworks
 */
export async function detectFrameworksInDirectory(dirPath: string, maxFiles: number = 20): Promise<string[]> {
	const frameworks = new Set<string>()

	try {
		const files = await fs.readdir(dirPath)
		let fileCount = 0

		for (const file of files) {
			if (fileCount >= maxFiles) break

			const filePath = path.join(dirPath, file)
			const stat = await fs.stat(filePath)

			if (stat.isFile()) {
				const detected = await detectFrameworksInFile(filePath)
				detected.forEach(fw => frameworks.add(fw))
				fileCount++
			}
		}

		return Array.from(frameworks)
	} catch (error) {
		console.warn(`⚠️ Failed to detect frameworks in directory ${dirPath}:`, error)
		return []
	}
}
