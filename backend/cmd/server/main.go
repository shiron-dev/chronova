// Command server runs the Chronova API server.
package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/shiron-dev/chronova/backend/internal/api"
	"github.com/shiron-dev/chronova/backend/internal/seed"
	"github.com/shiron-dev/chronova/backend/internal/store"
)

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	dbPath := flag.String("db", "./chronova.db", "SQLite database path")
	flag.Parse()

	st, err := store.Open(*dbPath)
	if err != nil {
		log.Fatalf("open store: %v", err)
	}
	defer st.Close()

	seeded, err := seed.Run(st)
	if err != nil {
		log.Fatalf("seed: %v", err)
	}
	if seeded {
		log.Printf("seeded demo data into %s", *dbPath)
	}

	log.Printf("chronova api listening on %s (db: %s)", *addr, *dbPath)
	if err := http.ListenAndServe(*addr, api.NewRouter(st)); err != nil {
		log.Fatalf("serve: %v", err)
	}
}
