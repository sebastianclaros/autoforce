{{#with issue}}
#{{number}}: {{title}} 
{{state}}
{{#each labels}}{{this}}{{/each}}
{{url}}
{{milestone.title}}
{{body}}
{{/with}}