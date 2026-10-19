import { Injectable } from '@nestjs/common';
import {
    MailTemplateEngine,
    MailTemplateError,
    type MailTemplateRenderOptions,
} from '@nestjs/mail';
import Handlebars from 'handlebars';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Template files are copied next to the bundle under the monorepo rootDir layout:
 * `dist/apps/mail_worker/apps/mail_worker/src/mail/templates`.
 */
const TEMPLATES_DIR = join(
    import.meta.dirname,
    'apps/mail_worker/src/mail/templates',
);

@Injectable()
export class HandlebarsTemplateEngine extends MailTemplateEngine {
    private readonly templates = new Map<
        string,
        ReturnType<typeof Handlebars.compile> | undefined
    >();
    private partialsReady: Promise<void> | undefined;

    async render(
        name: string,
        context: object,
        { locale }: MailTemplateRenderOptions,
    ): Promise<string> {
        await this.ensurePartials();

        const localized =
            locale && /^[a-z]{2}$/.test(locale) ? [`${name}.${locale}.hbs`] : [];

        for (const file of [...localized, `${name}.hbs`]) {
            const template = await this.load(file);
            if (!template) {
                continue;
            }

            const body = template(context);
            const layout = await this.load('layout.hbs');
            if (!layout) {
                return body;
            }

            return layout({
                ...context,
                body: new Handlebars.SafeString(body),
            });
        }

        throw new MailTemplateError(`No template "${name}" in ${TEMPLATES_DIR}`, {
            template: name,
        });
    }

    private async ensurePartials(): Promise<void> {
        if (!this.partialsReady) {
            this.partialsReady = this.registerPartials();
        }
        await this.partialsReady;
    }

    private async registerPartials(): Promise<void> {
        const partialsDir = join(TEMPLATES_DIR, 'partials');
        let files: string[];
        try {
            files = await readdir(partialsDir);
        } catch {
            return;
        }

        await Promise.all(
            files
                .filter((file) => file.endsWith('.hbs'))
                .map(async (file) => {
                    const source = await readFile(join(partialsDir, file), 'utf8');
                    const name = file.replace(/\.hbs$/, '');
                    Handlebars.registerPartial(name, source);
                }),
        );
    }

    private async load(file: string) {
        if (!this.templates.has(file)) {
            const source = await readFile(join(TEMPLATES_DIR, file), 'utf8').catch(
                () => undefined,
            );
            this.templates.set(
                file,
                source === undefined
                    ? undefined
                    : Handlebars.compile(source, { compat: true }),
            );
        }
        return this.templates.get(file);
    }
}
